import { Controller, Post, Logger, HttpCode, HttpStatus, Req, Headers } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
import { GoodConductWebhookService } from './good-conduct-webhook.service';
import { IremboPayWebhookService } from './irembo-pay-webhook.service';
import { IREMBOPAY_SIGNATURE_HEADER } from '../integrations/irembo-pay/irembo-pay-signature.util';

/**
 * Public webhook endpoints the payment gateway posts to after a payment
 * completes. No JWT auth — the calls originate from the provider's servers, so
 * authenticity comes from the HMAC signature, not from a session.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly marriageWebhook: MarriageWebhookService,
    private readonly donationWebhook: DonationWebhookService,
    private readonly goodConductWebhook: GoodConductWebhookService,
    private readonly iremboWebhook: IremboPayWebhookService,
  ) {}

  /**
   * IremboPay payment notification — HMAC-signed.
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
}
