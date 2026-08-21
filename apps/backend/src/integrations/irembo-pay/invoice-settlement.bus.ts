import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStateChange } from './irembopay-invoice.service';

type SettlementListener = (change: InvoiceStateChange) => Promise<void> | void;

/**
 * Carries a settled invoice from wherever it was noticed to whoever acts on it.
 *
 * Both the webhook and the reconciliation sweep call the same
 * `applyInvoiceState`, and both must produce the same downstream effects —
 * domain records updated, SMS sent, admin SSE fired. Emitting from the single
 * apply path is what makes that true by construction, rather than by two call
 * sites remembering to do the same thing.
 *
 * A bus rather than a direct call because the subscriber lives in
 * `WebhooksModule`, which already imports this module; calling it directly
 * would close the loop into a dependency cycle.
 */
@Injectable()
export class InvoiceSettlementBus {
  private readonly logger = new Logger(InvoiceSettlementBus.name);
  private readonly listeners = new Set<SettlementListener>();

  subscribe(listener: SettlementListener): void {
    this.listeners.add(listener);
  }

  /** Awaits every listener so the caller knows the fan-out finished. */
  async emit(change: InvoiceStateChange): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(change);
      } catch (err) {
        // One failing subscriber must not stop the others, nor fail the webhook.
        this.logger.error(
          `Settlement listener failed for invoice ${change.invoice.invoiceNumber}: ${err}`,
        );
      }
    }
  }
}
