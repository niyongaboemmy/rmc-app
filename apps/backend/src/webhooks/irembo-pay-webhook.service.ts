import { Injectable, Logger } from '@nestjs/common';
import { IremboPayConfigService } from '../integrations/irembo-pay/irembo-pay.config.service';
import {
  IremboPayInvoiceService,
  InvoiceStateChange,
} from '../integrations/irembo-pay/irembopay-invoice.service';
import { verifyIremboSignature } from '../integrations/irembo-pay/irembo-pay-signature.util';
import { IremboInvoice, IremboNotification } from '../integrations/irembo-pay/irembo-pay.types';
import { InvoiceSettlementBus } from '../integrations/irembo-pay/invoice-settlement.bus';
import { PaymentEventsService } from '../payment-settings/payment-events.service';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
import { GoodConductWebhookService } from './good-conduct-webhook.service';

export type WebhookOutcome =
  | 'applied'
  | 'duplicate'
  | 'unknown_invoice'
  | 'invalid_signature'
  | 'malformed'
  | 'error';

export interface WebhookResult {
  outcome: WebhookOutcome;
  invoiceNumber?: string;
  status?: string;
}

/**
 * Applies an IremboPay payment notification.
 *
 * Every path here is designed around one rule: the caller returns HTTP 200 no
 * matter what. A 4xx would tell a prober whether their forgery was well-formed
 * and would make IremboPay retry a request we are never going to accept. So
 * failures are logged and classified, not raised.
 */
@Injectable()
export class IremboPayWebhookService {
  private readonly logger = new Logger(IremboPayWebhookService.name);

  constructor(
    private readonly config: IremboPayConfigService,
    private readonly invoices: IremboPayInvoiceService,
    private readonly paymentEvents: PaymentEventsService,
    private readonly marriageWebhook: MarriageWebhookService,
    private readonly donationWebhook: DonationWebhookService,
    private readonly goodConductWebhook: GoodConductWebhookService,
    settlements: InvoiceSettlementBus,
  ) {
    // Subscribed rather than called: this way an invoice recovered by the
    // reconciliation sweep produces exactly the same effects as one delivered
    // by a webhook, without either path duplicating the fan-out.
    settlements.subscribe((change) => this.dispatch(change));
  }

  async handle(rawBody: Buffer | string | undefined, signature?: string): Promise<WebhookResult> {
    const cfg = await this.config.get();

    if (!rawBody || !rawBody.length) {
      this.logger.warn('[IremboPay Webhook] Empty body — the raw-body capture may be missing');
      return { outcome: 'malformed' };
    }

    const check = verifyIremboSignature(
      cfg.secretKey,
      rawBody,
      signature,
      cfg.signatureToleranceSeconds,
    );
    if (!check.valid) {
      this.logger.warn(`[IremboPay Webhook] Rejected — ${check.reason}`);
      return { outcome: 'invalid_signature' };
    }

    let notification: IremboNotification;
    try {
      notification = JSON.parse(
        Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody,
      ) as IremboNotification;
    } catch {
      this.logger.warn('[IremboPay Webhook] Signature valid but the body is not JSON');
      return { outcome: 'malformed' };
    }

    const remote = notification.data as IremboInvoice | undefined;
    if (!remote?.invoiceNumber && !remote?.transactionId) {
      this.logger.warn('[IremboPay Webhook] Payload carries no invoice reference');
      return { outcome: 'malformed' };
    }

    const change = await this.invoices.applyInvoiceState(
      remote,
      'webhook',
      notification as unknown as Record<string, unknown>,
    );

    if (!change) {
      // Could legitimately be another environment pointed at this URL.
      return { outcome: 'unknown_invoice', invoiceNumber: remote.invoiceNumber };
    }

    if (!change.changed && change.previousStatus === 'PAID') {
      return { outcome: 'duplicate', invoiceNumber: remote.invoiceNumber, status: 'PAID' };
    }

    return {
      outcome: 'applied',
      invoiceNumber: change.invoice.invoiceNumber ?? undefined,
      status: change.status,
    };
  }

  /**
   * Fans the settled invoice out to the domain services and the admin SSE
   * stream.
   *
   * The domain services key off `requesttransactionid` prefixes (`DON-`, `MAR-`,
   * `GC-`), so charges reuse those prefixes and the matching logic stays shared
   * rather than duplicated per domain.
   *
   * `PARTIALLY_PAID` deliberately does not reach the domain services: the
   * balance is recorded, but a half-paid invoice must not fulfil an order.
   */
  async dispatch(change: InvoiceStateChange): Promise<void> {
    const { invoice, status, resolvedStatus } = change;

    this.paymentEvents.emit({
      type:
        resolvedStatus === 'SUCCESSFUL'
          ? 'payment.confirmed'
          : resolvedStatus === 'FAILED'
            ? 'payment.failed'
            : 'payment.pending',
      requestTransactionId: invoice.transactionId,
      transactionId: invoice.invoiceNumber ?? '',
      status: resolvedStatus,
      responseCode: status,
      message:
        status === 'PARTIALLY_PAID'
          ? `Partially paid — ${invoice.balance ?? 0} ${invoice.currency} outstanding`
          : `Invoice ${invoice.invoiceNumber} is ${status}`,
    });

    if (status === 'PARTIALLY_PAID' || status === 'NEW') {
      this.logger.log(
        `[IremboPay Webhook] Invoice ${invoice.invoiceNumber} is ${status} — domain record left pending`,
      );
      return;
    }

    // The domain handlers still parse the flat, lower-cased callback shape the
    // original gateway defined — including its `Successfull` spelling. It is a
    // fossil now that only one provider remains, but it is also the code path
    // that credits money, so replacing it belongs in its own change with its
    // own tests rather than in a provider migration.
    const payload: Record<string, string> = {
      requesttransactionid: invoice.transactionId,
      transactionid: invoice.invoiceNumber ?? '',
      responsecode: resolvedStatus === 'SUCCESSFUL' ? '01' : '1008',
      status: resolvedStatus === 'SUCCESSFUL' ? 'Successfull' : 'Failed',
      statusdesc:
        resolvedStatus === 'SUCCESSFUL'
          ? `Paid via ${invoice.paymentMethod ?? 'IremboPay'}`
          : 'Invoice expired before payment',
      message:
        resolvedStatus === 'SUCCESSFUL'
          ? `Paid via ${invoice.paymentMethod ?? 'IremboPay'}`
          : 'Invoice expired before payment',
    };

    // Each domain handler is isolated: one throwing must not stop the others
    // from seeing a payment they are responsible for.
    for (const [name, handler] of [
      ['marriage', this.marriageWebhook],
      ['donation', this.donationWebhook],
      ['good-conduct', this.goodConductWebhook],
    ] as const) {
      try {
        await handler.handleCallback(payload);
      } catch (err) {
        this.logger.error(
          `[IremboPay Webhook] ${name} handler failed for ${invoice.transactionId}: ${err}`,
        );
      }
    }
  }
}
