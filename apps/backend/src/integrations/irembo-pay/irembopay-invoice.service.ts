import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
   *
   * That guard alone is not enough against *concurrent* deliveries: two
   * webhook calls (a genuine re-push, or a race with the reconciliation sweep)
   * can both read the row before either writes it, both see `previousStatus:
   * NEW`, and both conclude `changed: true` — which fires the settlement bus
   * twice for one payment. Confirmed live: five concurrent identical callbacks
   * against one invoice produced four duplicate status-history rows and four
   * duplicate SMS sends. `SELECT ... FOR UPDATE` inside a transaction closes
   * the window — the second caller's read blocks until the first's write
   * commits, so it sees the row already PAID and takes the sticky-state path
   * above instead of a second `changed: true`.
   *
   * The settlement bus is emitted *after* the transaction commits, not from
   * inside it. `dispatch()` fans out to three domain handlers, each doing its
   * own DB writes; running that chain while still holding the row lock only
   * lengthens the window every other concurrent delivery for this invoice sits
   * blocked in, for no benefit — the lock's job is done once this row is
   * written, and nothing downstream needs it held any longer.
   */
  async applyInvoiceState(
    remote: IremboInvoice,
    source: 'webhook' | 'reconciliation',
    rawPayload?: Record<string, unknown>,
  ): Promise<InvoiceStateChange | null> {
    const change = await this.dataSource.transaction(async (manager) => {
      const invoice = await this.lockInvoiceForUpdate(manager, remote);

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
        } satisfies InvoiceStateChange;
      }

      this.assignFromRemote(invoice, remote);
      invoice.paymentStatus = incoming;
      invoice.rawPayload = (rawPayload ?? (remote as unknown as Record<string, unknown>)) || null;

      const saved = await manager.save(IremboPayInvoice, invoice);
      const resolvedStatus = toGatewayStatus(incoming);
      await this.upsertLedgerRow(saved, {}, manager);

      const changed = previousStatus !== incoming;
      this.logger.log(
        `[IremboPay] ${source}: invoice ${saved.invoiceNumber} ${previousStatus} → ${incoming}` +
          (changed ? '' : ' (no status change)'),
      );

      return {
        invoice: saved,
        previousStatus,
        status: incoming,
        changed,
        resolvedStatus,
      } satisfies InvoiceStateChange;
    });

    // Outside the lock: the row is already committed, so a second concurrent
    // caller can proceed the moment this transaction ends rather than waiting
    // out the domain fan-out too.
    if (change?.changed) await this.settlements.emit(change);

    return change;
  }

  /**
   * `SELECT ... FOR UPDATE` on the invoice row. A concurrent caller for the
   * same invoice blocks here until the first transaction commits or rolls
   * back — that serialisation is the entire fix.
   */
  private async lockInvoiceForUpdate(
    manager: EntityManager,
    remote: IremboInvoice,
  ): Promise<IremboPayInvoice | null> {
    const qb = manager.createQueryBuilder(IremboPayInvoice, 'inv').setLock('pessimistic_write');

    if (remote.invoiceNumber) {
      const byNumber = await qb
        .where('inv.invoice_number = :ref', { ref: remote.invoiceNumber })
        .getOne();
      if (byNumber) return byNumber;
    }
    if (remote.transactionId) {
      return manager
        .createQueryBuilder(IremboPayInvoice, 'inv')
        .setLock('pessimistic_write')
        .where('inv.transaction_id = :ref', { ref: remote.transactionId })
        .getOne();
    }
    return null;
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
    manager?: EntityManager,
  ): Promise<PaymentTransaction> {
    // Runs inside the caller's transaction when one is given, so the ledger
    // write is covered by the same row lock as the invoice write — a
    // concurrent caller blocked on the invoice cannot race this either.
    const txRepo = manager ? manager.getRepository(PaymentTransaction) : this.txRepo;

    const existing = await txRepo.findOne({
      where: { requestTransactionId: invoice.transactionId, provider: 'irembopay' },
    });

    const tx =
      existing ??
      txRepo.create({
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

    return txRepo.save(tx);
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
