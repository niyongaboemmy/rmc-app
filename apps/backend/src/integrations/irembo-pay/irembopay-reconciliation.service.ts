import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IremboPayService } from './irembo-pay.service';
import { IremboPayConfigService } from './irembo-pay.config.service';
import { IremboPayInvoiceService } from './irembopay-invoice.service';
import { IremboPayApiError } from './irembo-pay.types';

/**
 * Re-checks open IremboPay invoices so a lost callback never means a lost payment.
 *
 * This matters more here than it does for IntouchPay. A MoMo push either
 * succeeds or fails within a minute; a bank or branch payment legitimately
 * completes hours later — "paid at a BK branch on Saturday" is a normal event,
 * not an edge case. Without this sweep those payments would sit PENDING until
 * someone complained.
 *
 * Changes are applied through `applyInvoiceService.applyInvoiceState` — the same
 * handler the webhook uses. One code path, one set of bugs.
 */
@Injectable()
export class IremboPayReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IremboPayReconciliationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  private readonly RUN_INTERVAL_MS = 10 * 60 * 1000;
  /** Below this age the webhook is probably still in flight — don't race it. */
  private readonly MIN_AGE_MINUTES = 5;
  /** Beyond this, an unpaid invoice is not coming back. Bounds the sweep. */
  private readonly MAX_AGE_HOURS = 48;
  private readonly BATCH_LIMIT = 50;
  /** Spacing between provider calls — a 429 storm helps nobody. */
  private readonly CALL_SPACING_MS = 250;

  constructor(
    private readonly irembo: IremboPayService,
    private readonly config: IremboPayConfigService,
    private readonly invoices: IremboPayInvoiceService,
  ) {}

  onModuleInit(): void {
    // Let the app finish starting before the first sweep. Held so shutdown can
    // cancel it: a short-lived process (a CLI script, a test) closes the app
    // before this fires, and an uncancelled sweep then queries a closed
    // connection and crashes the process on its way out.
    this.startupTimer = setTimeout(() => void this.reconcile(), 60_000);
    this.timer = setInterval(() => void this.reconcile(), this.RUN_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer);
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(): Promise<{ checked: number; updated: number; failed: number }> {
    const summary = { checked: 0, updated: 0, failed: 0 };

    // A slow provider must not let two sweeps overlap and double the load.
    if (this.running) {
      this.logger.warn('[IremboPay Reconcile] Previous run still in progress — skipping');
      return summary;
    }

    if (!(await this.config.isConfigured())) return summary;

    this.running = true;
    try {
      const minAge = new Date(Date.now() - this.MIN_AGE_MINUTES * 60 * 1000);
      const maxAge = new Date(Date.now() - this.MAX_AGE_HOURS * 60 * 60 * 1000);

      // Already-terminal invoices are excluded by the query, so a paid invoice
      // costs no API call at all.
      const open = await this.invoices.findOpenForReconciliation(minAge, maxAge, this.BATCH_LIMIT);
      if (open.length === 0) return summary;

      for (const invoice of open) {
        summary.checked++;
        try {
          const remote = await this.irembo.getInvoice(
            invoice.invoiceNumber ?? invoice.transactionId,
          );
          const change = await this.invoices.applyInvoiceState(remote, 'reconciliation');
          if (change?.changed) summary.updated++;
        } catch (err) {
          summary.failed++;
          const code = err instanceof IremboPayApiError ? err.code : 'UNKNOWN';
          this.logger.warn(
            `[IremboPay Reconcile] ${invoice.invoiceNumber ?? invoice.transactionId} failed (${code})`,
          );
          // A rate limit means the whole batch is unwelcome — stop, try next run.
          if (err instanceof IremboPayApiError && err.httpStatus === 429) {
            this.logger.warn('[IremboPay Reconcile] Rate limited — ending this run early');
            break;
          }
        }
        await sleep(this.CALL_SPACING_MS);
      }

      this.logger.log(
        `[IremboPay Reconcile] checked=${summary.checked} updated=${summary.updated} failed=${summary.failed}`,
      );
      return summary;
    } finally {
      this.running = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
