import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IremboPayInvoice, IremboInvoiceStatus } from './entities/irembopay-invoice.entity';
import { IremboInvoice, parseIremboDate } from './irembo-pay.types';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../../payment-settings/entities/payment-transaction.entity';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';
import { GatewayStatus } from '../../payments/payment-gateway.port';
import { InvoiceSettlementBus } from './invoice-settlement.bus';

/** What `applyInvoiceState` did, so callers know whether to notify anyone. */
export interface InvoiceStateChange {
  invoice: IremboPayInvoice;
  previousStatus: IremboInvoiceStatus;
  status: IremboInvoiceStatus;
  /** False when the payload told us nothing we did not already know. */
  changed: boolean;
  /** The normalised business outcome for domain services and the SSE stream. */
  resolvedStatus: GatewayStatus;
}

/**
 * Owns the `irembopay_invoices` mirror and the ledger rows that shadow it.
 *
 * `applyInvoiceState` is deliberately the *only* way an invoice changes state.
 * The webhook and the reconciliation sweep both funnel through it, so the
 * idempotency and partial-payment rules are written once — two code paths would
 * mean two sets of double-crediting bugs.
 */
@Injectable()
export class IremboPayInvoiceService {
  private readonly logger = new Logger(IremboPayInvoiceService.name);

  constructor(
    @InjectRepository(IremboPayInvoice)
    private readonly invoiceRepo: Repository<IremboPayInvoice>,
    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
    private readonly settlements: InvoiceSettlementBus,
  ) {}

  findByTransactionId(transactionId: string): Promise<IremboPayInvoice | null> {
    return this.invoiceRepo.findOne({ where: { transactionId } });
  }

  findByInvoiceNumber(invoiceNumber: string): Promise<IremboPayInvoice | null> {
    return this.invoiceRepo.findOne({ where: { invoiceNumber } });
  }

  /** Invoices worth re-checking: still open, old enough not to race the webhook. */
  findOpenForReconciliation(
    minAge: Date,
    maxAge: Date,
    limit: number,
  ): Promise<IremboPayInvoice[]> {
    return this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.payment_status IN (:...statuses)', { statuses: ['NEW', 'PARTIALLY_PAID'] })
      .andWhere('inv.created_at < :minAge', { minAge })
      .andWhere('inv.created_at > :maxAge', { maxAge })
      .orderBy('inv.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  /** Records a freshly created provider invoice, plus its ledger row. */
  async recordNewInvoice(
    remote: IremboInvoice,
    context: {
      paymentTypeKey?: string;
      referenceId?: string;
      isTest: boolean;
      payerPhone?: string;
      paymentLinkUrl?: string;
      initiatedBy?: string;
    },
  ): Promise<IremboPayInvoice> {
    const existing = await this.findByTransactionId(remote.transactionId);
    const invoice = existing ?? this.invoiceRepo.create({ transactionId: remote.transactionId });

    this.assignFromRemote(invoice, remote);
    invoice.paymentTypeKey = context.paymentTypeKey ?? invoice.paymentTypeKey ?? null;
    invoice.referenceId = context.referenceId ?? invoice.referenceId ?? null;
    invoice.isTest = context.isTest;
    invoice.rawPayload = remote as unknown as Record<string, unknown>;

    const saved = await this.invoiceRepo.save(invoice);
    await this.upsertLedgerRow(saved, {
      payerPhone: context.payerPhone,
      initiatedBy: context.initiatedBy,
    });
    return saved;
  }

  /**
   * Applies a provider-side invoice state — from a webhook or a reconciliation
   * fetch — to the mirror and the ledger.
   *
   * Terminal states are sticky: once an invoice is PAID, a repeated PAID
   * payload is acknowledged and dropped. IremboPay's portal can re-push
   * notifications, and double-crediting a donation is the worst outcome here.
   */
  async applyInvoiceState(
    remote: IremboInvoice,
    source: 'webhook' | 'reconciliation',
    rawPayload?: Record<string, unknown>,
  ): Promise<InvoiceStateChange | null> {
    const invoice =
      (remote.invoiceNumber && (await this.findByInvoiceNumber(remote.invoiceNumber))) ||
      (remote.transactionId && (await this.findByTransactionId(remote.transactionId))) ||
      null;

    if (!invoice) {
      this.logger.warn(
        `[IremboPay] ${source}: unknown invoice ${remote.invoiceNumber ?? remote.transactionId} — ignoring`,
      );
      return null;
    }

    const previousStatus = invoice.paymentStatus;
    const incoming = this.normaliseStatus(remote, invoice);

    if (previousStatus === 'PAID') {
      this.logger.log(
        `[IremboPay] ${source}: invoice ${invoice.invoiceNumber} already PAID — acknowledged, no change`,
      );
      return {
        invoice,
        previousStatus,
        status: previousStatus,
        changed: false,
        resolvedStatus: 'SUCCESSFUL',
      };
    }

    this.assignFromRemote(invoice, remote);
    invoice.paymentStatus = incoming;
    invoice.rawPayload = (rawPayload ?? (remote as unknown as Record<string, unknown>)) || null;

    const saved = await this.invoiceRepo.save(invoice);
    const resolvedStatus = toGatewayStatus(incoming);
    await this.upsertLedgerRow(saved, {});

    const changed = previousStatus !== incoming;
    this.logger.log(
      `[IremboPay] ${source}: invoice ${saved.invoiceNumber} ${previousStatus} → ${incoming}` +
        (changed ? '' : ' (no status change)'),
    );

    const change: InvoiceStateChange = {
      invoice: saved,
      previousStatus,
      status: incoming,
      changed,
      resolvedStatus,
    };

    // Emitted from the single apply path, so a payment recovered by the
    // reconciliation sweep reaches the domain services and the admin stream
    // exactly as a webhook-delivered one does.
    if (changed) await this.settlements.emit(change);

    return change;
  }

  /**
   * `PARTIALLY_PAID` stays PENDING on purpose — the domain record must not be
   * fulfilled until the balance reaches zero. An unpaid invoice past its expiry
   * is FAILED even though IremboPay never pushes an EXPIRED notification.
   */
  private normaliseStatus(remote: IremboInvoice, local: IremboPayInvoice): IremboInvoiceStatus {
    const status = remote.paymentStatus ?? local.paymentStatus;
    if (status === 'PAID' || status === 'PARTIALLY_PAID') return status;

    const expiry = parseIremboDate(remote.expiryAt) ?? local.expiryAt;
    if (expiry && expiry.getTime() < Date.now()) return 'EXPIRED';
    return status ?? 'NEW';
  }

  private assignFromRemote(invoice: IremboPayInvoice, remote: IremboInvoice): void {
    invoice.invoiceNumber = remote.invoiceNumber ?? invoice.invoiceNumber ?? null;
    invoice.paymentAccountIdentifier =
      remote.paymentAccountIdentifier ?? invoice.paymentAccountIdentifier;
    if (remote.amount !== undefined) invoice.amount = Number(remote.amount);
    if (remote.currency) invoice.currency = remote.currency;
    if (remote.paymentStatus) invoice.paymentStatus = remote.paymentStatus;
    invoice.paymentMethod = remote.paymentMethod ?? invoice.paymentMethod ?? null;
    invoice.paymentReference = remote.paymentReference ?? invoice.paymentReference ?? null;
    invoice.paymentLinkUrl = remote.paymentLinkUrl ?? invoice.paymentLinkUrl ?? null;
    invoice.expiryAt = parseIremboDate(remote.expiryAt) ?? invoice.expiryAt;
    invoice.paidAt = parseIremboDate(remote.paidAt) ?? invoice.paidAt;
    if (remote.partialPaymentEnabled !== undefined) {
      invoice.partialPaymentEnabled = remote.partialPaymentEnabled;
    }
    if (remote.paidAmount !== undefined) invoice.paidAmount = Number(remote.paidAmount);
    if (remote.balance !== undefined) invoice.balance = Number(remote.balance);
  }

  /** Keeps the shared `payment_transactions` ledger in step with the mirror. */
  private async upsertLedgerRow(
    invoice: IremboPayInvoice,
    context: { payerPhone?: string; initiatedBy?: string },
  ): Promise<PaymentTransaction> {
    const existing = await this.txRepo.findOne({
      where: { requestTransactionId: invoice.transactionId, provider: 'irembopay' },
    });

    const tx =
      existing ??
      this.txRepo.create({
        requestTransactionId: invoice.transactionId,
        provider: 'irembopay',
        paymentMethodCode: PaymentMethodCode.IREMBOPAY,
        initiatedBy: context.initiatedBy ?? null,
      });

    tx.gatewayTransactionId = invoice.invoiceNumber;
    tx.invoiceNumber = invoice.invoiceNumber;
    tx.paymentTypeKey = invoice.paymentTypeKey;
    tx.referenceId = invoice.referenceId;
    tx.amount = invoice.amount;
    tx.currency = invoice.currency;
    tx.mobilePhone = context.payerPhone ?? tx.mobilePhone ?? null;
    tx.paymentLinkUrl = invoice.paymentLinkUrl;
    tx.providerPaymentMethod = invoice.paymentMethod;
    tx.paidAmount = invoice.paidAmount;
    tx.balance = invoice.balance;
    tx.isTest = invoice.isTest;
    tx.responseCode = invoice.paymentStatus;
    tx.message = describeStatus(invoice);

    const resolved = toGatewayStatus(invoice.paymentStatus);
    tx.status =
      resolved === 'SUCCESSFUL'
        ? PaymentTransactionStatus.SUCCESSFUL
        : resolved === 'FAILED'
          ? PaymentTransactionStatus.FAILED
          : PaymentTransactionStatus.PENDING;
    tx.completedAt = resolved === 'PENDING' ? null : (invoice.paidAt ?? new Date());

    return this.txRepo.save(tx);
  }
}

export function toGatewayStatus(status: IremboInvoiceStatus): GatewayStatus {
  if (status === 'PAID') return 'SUCCESSFUL';
  if (status === 'EXPIRED') return 'FAILED';
  return 'PENDING';
}

function describeStatus(invoice: IremboPayInvoice): string {
  switch (invoice.paymentStatus) {
    case 'PAID':
      return `Paid via ${invoice.paymentMethod ?? 'IremboPay'}`;
    case 'PARTIALLY_PAID':
      return `Partially paid — ${invoice.paidAmount ?? 0} of ${invoice.amount} ${invoice.currency}, ${invoice.balance ?? 0} outstanding`;
    case 'EXPIRED':
      return 'Invoice expired before payment';
    default:
      return 'Awaiting payment';
  }
}
