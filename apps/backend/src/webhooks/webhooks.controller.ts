import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Req, Headers } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentEventsService } from '../payment-settings/payment-events.service';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
import { GoodConductWebhookService } from './good-conduct-webhook.service';
import { IremboPayWebhookService } from './irembo-pay-webhook.service';
import { IREMBOPAY_SIGNATURE_HEADER } from '../integrations/irembo-pay/irembo-pay-signature.util';

/**
 * Public webhook endpoints called by IntouchPay after payment completion.
 * No JWT auth — IntouchPay posts from their servers.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentSettings: PaymentSettingsService,
    private readonly paymentEvents: PaymentEventsService,
    private readonly marriageWebhook: MarriageWebhookService,
    private readonly donationWebhook: DonationWebhookService,
    private readonly goodConductWebhook: GoodConductWebhookService,
    private readonly iremboWebhook: IremboPayWebhookService,
  ) {}

  /**
   * IremboPay payment notification — HMAC-signed, unlike the IntouchPay route.
   *
   * Returns 200 on every path, including an invalid signature: a 4xx would tell
   * a prober whether their forgery was well-formed, and would make IremboPay
   * retry a request we will never accept. What actually happened is in the log
   * and in `payment_provider_events`, not in the status code.
   *
   * The signature covers the raw request bytes, captured by the `verify` hook
   * on the JSON body parser in `main.ts`.
   */
  @Public()
  @SkipTransform()
  @Post('irembopay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'IremboPay signed payment notification (public webhook)' })
  async iremboPayCallback(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers(IREMBOPAY_SIGNATURE_HEADER) signature?: string,
  ) {
    try {
      const rawBody =
        req.rawBody ?? (req.body !== undefined ? JSON.stringify(req.body) : undefined);
      const result = await this.iremboWebhook.handle(rawBody, signature);

      this.logger.log(
        `[IremboPay Callback] outcome=${result.outcome} invoice=${result.invoiceNumber ?? '-'} status=${result.status ?? '-'}`,
      );

      return { success: true, message: 'received' };
    } catch (err) {
      // Never reject the callback — always 200, even on an internal error.
      this.logger.error(`[IremboPay Callback] Processing error: ${err}`);
      return { success: true, message: 'received' };
    }
  }

  /**
   * IntouchPay callback (section 2.7 of API docs).
   * Payload: requesttransactionid, transactionid, responsecode, status, statusdesc, referenceno
   *
   * Response must be 200 OK with JSON: { message:'success', success:true, request_id:'...' }
   */
  @Public()
  @SkipTransform()
  @Post('intouch-pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'IntouchPay payment callback (public webhook)' })
  async intouchPayCallback(@Body() body: Record<string, unknown>) {
    // §2.7: IntouchPay wraps the data inside a `jsonpayload` key.
    // Body arrives as: { "jsonpayload": { "requesttransactionid": "...", ... } }
    // Fallback to flat body in case the integration sends unwrapped data.
    const raw = body['jsonpayload'] ?? body;
    const payload: Record<string, string> = Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
    );

    this.logger.log(
      `[IntouchPay Callback] txn=${payload['requesttransactionid']} status=${payload['status']} code=${payload['responsecode']}`,
    );

    try {
      // Update the global PaymentTransaction record and get resolved status
      const result = await this.paymentSettings.handleIntouchCallback(payload);

      // Push SSE event to connected admin browsers
      if (result) {
        const eventType =
          result.resolvedStatus === 'SUCCESSFUL'
            ? 'payment.confirmed'
            : result.resolvedStatus === 'FAILED'
              ? 'payment.failed'
              : 'payment.pending';

        this.paymentEvents.emit({
          type: eventType,
          requestTransactionId: result.requestTransactionId,
          transactionId: result.transactionId,
          status: result.resolvedStatus,
          responseCode: result.responseCode,
          message: result.message,
        });
      }

      // Also update any domain-specific records (marriage, donations, etc.)
      await this.marriageWebhook.handleCallback(payload);
      await this.donationWebhook.handleCallback(payload);
      await this.goodConductWebhook.handleCallback(payload);
    } catch (err) {
      // Never reject the callback — always return 200 OK
      this.logger.error(`[IntouchPay Callback] Processing error: ${err}`);
    }

    const ack = {
      message: 'success',
      success: true,
      request_id: payload['requesttransactionid'] ?? '',
    };

    this.logger.log(
      `[IntouchPay Callback] Acknowledged txn=${ack.request_id} → ${JSON.stringify(ack)}`,
    );

    return ack;
  }
}
