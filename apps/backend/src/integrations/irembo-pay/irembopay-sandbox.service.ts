import { Injectable, Logger } from '@nestjs/common';
import {
  CreateInvoiceInput,
  InitiatePushInput,
  IremboInvoice,
  IremboPayApiError,
  IremboPaymentStatus,
  IremboPushResult,
  UpdateInvoiceInput,
} from './irembo-pay.types';

// Re-exported so callers can keep importing the simulator vocabulary from the
// simulator. It is defined in the types module to keep config and sandbox from
// importing each other.
export {
  DEFAULT_SIMULATOR_DELAY_MS,
  IREMBO_SIMULATOR_MODES,
  type IremboSimulatorMode,
} from './irembo-pay.types';
import { IremboPayConfigService } from './irembo-pay.config.service';
import { IremboPayInvoiceService } from './irembopay-invoice.service';

interface SandboxInvoice {
  invoice: IremboInvoice;
  /** When the simulated payer acts. `null` in `pending` mode — they never do. */
  resolveAt: number | null;
  resolveTo: Extract<IremboPaymentStatus, 'PAID' | 'EXPIRED'>;
  settled: boolean;
}

/**
 * A local stand-in for IremboPay, for exercising payments with no credentials.
 *
 * The point is not to mock the HTTP calls — it is to let *everything after them*
 * run for real. It answers the same four endpoints with the same shapes, so the
 * provider, the invoice mirror, the ledger rows, the settlement bus and the
 * domain fan-out are all the production code paths. Only the network hop and
 * the merchant account are fake.
 *
 * It settles through `applyInvoiceState` for that reason: the plan's rule is
 * that an invoice changes state in exactly one place, and a simulator with its
 * own settlement path would be a second place to get double-crediting wrong.
 *
 * Safety: `isActive()` is false in production and false unless the method is in
 * test mode, so switching a live merchant to a simulated one takes two
 * deliberate mistakes rather than one.
 */
@Injectable()
export class IremboPaySandboxService {
  private readonly logger = new Logger(IremboPaySandboxService.name);

  private readonly byInvoiceNumber = new Map<string, SandboxInvoice>();
  private readonly byTransactionId = new Map<string, string>();
  private seq = 0;

  constructor(
    private readonly config: IremboPayConfigService,
    private readonly invoices: IremboPayInvoiceService,
  ) {}

  /**
   * Whether simulated payments are in force.
   *
   * Three conditions, all required. Production is excluded outright — a
   * simulator that can be switched on in production is a way to mark real
   * invoices paid without money.
   */
  async isActive(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') return false;
    const cfg = await this.config.get();
    return cfg.isTestMode && cfg.simulatorMode !== 'off';
  }

  /** `POST /payments/invoices` */
  async createInvoice(input: CreateInvoiceInput): Promise<IremboInvoice> {
    // The real API rejects a reused transactionId, and the provider has a
    // recovery path for exactly that. Simulating the success case only would
    // leave that path untested.
    if (this.byTransactionId.has(input.transactionId)) {
      throw new IremboPayApiError(
        'This transaction id has already been used.',
        400,
        'DUPLICATE_TRANSACTION_ID',
      );
    }

    const cfg = await this.config.get();
    const amount = input.paymentItems.reduce(
      (sum, item) => sum + Number(item.unitAmount) * Number(item.quantity ?? 1),
      0,
    );

    const invoiceNumber = this.nextInvoiceNumber();
    const invoice: IremboInvoice = {
      invoiceNumber,
      transactionId: input.transactionId,
      paymentAccountIdentifier: input.paymentAccountIdentifier,
      paymentItems: input.paymentItems,
      paymentStatus: 'NEW',
      amount,
      currency: 'RWF',
      type: 'SINGLE',
      createdAt: new Date().toISOString(),
      expiryAt: input.expiryAt,
      customer: input.customer,
      description: input.description,
      // Deliberately not a real URL: a simulated invoice cannot be paid on
      // IremboPay, and a link that 404s is clearer than one that looks live.
      paymentLinkUrl: `about:blank#simulated-invoice-${invoiceNumber}`,
    };

    const mode = cfg.simulatorMode;
    const entry: SandboxInvoice = {
      invoice,
      resolveAt: mode === 'pending' ? null : Date.now() + cfg.simulatorDelayMs,
      resolveTo: mode === 'fail' ? 'EXPIRED' : 'PAID',
      settled: false,
    };

    this.byInvoiceNumber.set(invoiceNumber, entry);
    this.byTransactionId.set(input.transactionId, invoiceNumber);

    this.logger.warn(
      `[IremboPay SIMULATED] Invoice ${invoiceNumber} created for ${amount} RWF ` +
        `(txn=${input.transactionId}, mode=${mode}) — no real money is involved`,
    );

    if (entry.resolveAt !== null) this.scheduleResolution(invoiceNumber, cfg.simulatorDelayMs);

    return { ...invoice };
  }

  /** `GET /payments/invoices/{ref}` — accepts an invoice number or our transaction id. */
  async getInvoice(ref: string): Promise<IremboInvoice> {
    const entry = this.find(ref);
    if (!entry) {
      throw new IremboPayApiError('No such invoice at IremboPay.', 404, 'INVOICE_NOT_FOUND');
    }

    // Resolve lazily as well as on the timer: a poll that arrives after the due
    // time must never see a stale NEW just because the timer has not run yet.
    this.applyDueTransition(entry);
    return { ...entry.invoice };
  }

  /** `POST /payments/transactions/initiate` */
  async initiateMomoPush(input: InitiatePushInput): Promise<IremboPushResult> {
    const entry = this.find(input.invoiceNumber);
    if (!entry) {
      throw new IremboPayApiError('No such invoice at IremboPay.', 404, 'INVOICE_NOT_FOUND');
    }

    this.logger.warn(
      `[IremboPay SIMULATED] MoMo prompt to ${input.accountIdentifier} for invoice ` +
        `${input.invoiceNumber} — no prompt is actually sent`,
    );

    return {
      accountIdentifier: input.accountIdentifier,
      paymentProvider: input.paymentProvider,
      invoiceNumber: input.invoiceNumber,
      amount: entry.invoice.amount,
      referenceId: `SIM-${input.invoiceNumber}`,
    };
  }

  /** `PUT /payments/invoices/{invoiceNumber}` */
  async updateInvoice(invoiceNumber: string, input: UpdateInvoiceInput): Promise<IremboInvoice> {
    const entry = this.find(invoiceNumber);
    if (!entry) {
      throw new IremboPayApiError('No such invoice at IremboPay.', 404, 'INVOICE_NOT_FOUND');
    }

    if (input.expiryAt) entry.invoice.expiryAt = input.expiryAt;
    if (input.partialPaymentEnabled !== undefined) {
      entry.invoice.partialPaymentEnabled = input.partialPaymentEnabled;
    }
    return { ...entry.invoice };
  }

  /**
   * Force the simulated payer to act now rather than after the delay. Drives the
   * "settle it" control in the admin test panel, where waiting is pointless.
   */
  async resolveNow(ref: string, outcome: 'PAID' | 'EXPIRED' = 'PAID'): Promise<IremboInvoice> {
    const entry = this.find(ref);
    if (!entry) {
      throw new IremboPayApiError('No such invoice at IremboPay.', 404, 'INVOICE_NOT_FOUND');
    }

    entry.resolveTo = outcome;
    entry.resolveAt = Date.now() - 1;
    this.applyDueTransition(entry);
    await this.settle(entry);
    return { ...entry.invoice };
  }

  /** Drops every simulated invoice. Used by tests and between manual runs. */
  reset(): void {
    this.byInvoiceNumber.clear();
    this.byTransactionId.clear();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private find(ref: string): SandboxInvoice | undefined {
    return (
      this.byInvoiceNumber.get(ref) ?? this.byInvoiceNumber.get(this.byTransactionId.get(ref) ?? '')
    );
  }

  /** Moves the invoice to its due state. Idempotent — a second call is a no-op. */
  private applyDueTransition(entry: SandboxInvoice): void {
    if (entry.resolveAt === null || Date.now() < entry.resolveAt) return;
    if (entry.invoice.paymentStatus !== 'NEW') return;

    const paid = entry.resolveTo === 'PAID';
    entry.invoice.paymentStatus = entry.resolveTo;

    if (paid) {
      entry.invoice.paidAt = new Date().toISOString();
      entry.invoice.paidAmount = entry.invoice.amount;
      entry.invoice.balance = 0;
      entry.invoice.paymentMethod = 'MTN_MOMO';
      entry.invoice.paymentReference = `SIM-${entry.invoice.invoiceNumber}`;
    }
  }

  /**
   * The simulated equivalent of the callback IremboPay would send.
   *
   * It is a settlement, not a notification: it goes through the same
   * `applyInvoiceState` the webhook and the reconciliation sweep use, so the
   * donation, the ledger row and the SSE event all happen exactly as they would
   * in production.
   */
  private async settle(entry: SandboxInvoice): Promise<boolean> {
    if (entry.settled || entry.invoice.paymentStatus === 'NEW') return false;

    const change = await this.invoices.applyInvoiceState(entry.invoice, 'reconciliation', {
      simulated: true,
    } as unknown as Record<string, unknown>);

    // `null` means the provider has not written the invoice row yet — the
    // charge is still in flight. Leave it unsettled so the next poll or the
    // retry below picks it up rather than losing the payment.
    if (!change) return false;

    entry.settled = true;
    this.logger.warn(
      `[IremboPay SIMULATED] Invoice ${entry.invoice.invoiceNumber} → ` +
        `${entry.invoice.paymentStatus} and settled downstream`,
    );
    return true;
  }

  /**
   * Two attempts, because the timer races the charge that created the invoice:
   * the provider persists its row *after* `createInvoice` returns, so a fast
   * simulator can be ready before there is anything to update.
   */
  private scheduleResolution(invoiceNumber: string, delayMs: number): void {
    const attempt = async (retriesLeft: number): Promise<void> => {
      const entry = this.byInvoiceNumber.get(invoiceNumber);
      if (!entry) return;

      this.applyDueTransition(entry);
      const done = await this.settle(entry);

      if (!done && retriesLeft > 0) {
        setTimeout(() => void attempt(retriesLeft - 1), 2_000).unref?.();
      }
    };

    // `unref` so a pending simulation never keeps the process alive.
    setTimeout(() => void attempt(2), delayMs).unref?.();
  }

  /** IremboPay invoice numbers are 12 digits; simulated ones start with 99. */
  private nextInvoiceNumber(): string {
    this.seq += 1;
    return `99${String(Date.now() % 100_000_000).padStart(8, '0')}${String(this.seq % 100).padStart(2, '0')}`;
  }
}
