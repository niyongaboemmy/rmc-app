import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';
import { PaymentSettingsService } from '../../payment-settings/payment-settings.service';
import { IntouchPayService } from '../../integrations/intouch-pay/intouch-pay.service';
import {
  PaymentChargeRequest,
  PaymentChargeResult,
  PaymentGatewayProvider,
  PaymentStatusResult,
} from '../payment-gateway.port';

/**
 * Adapter, not a rewrite: it maps the neutral port shape onto the existing
 * IntouchPayService calls and reproduces the behaviour the domain services
 * already rely on.
 *
 * In particular `providerReference` keeps the `requestTxnId|gatewayTxnId`
 * format that `donation-webhook.service.ts` and friends parse. Changing that
 * format silently breaks callback matching for every historical record.
 */
@Injectable()
export class IntouchPayProvider implements PaymentGatewayProvider {
  readonly code = PaymentMethodCode.MOMO_INTOUCH;
  readonly providerName = 'IntouchPay';

  private readonly logger = new Logger(IntouchPayProvider.name);

  constructor(
    private readonly intouchPay: IntouchPayService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly config: ConfigService,
  ) {}

  async isConfigured(): Promise<boolean> {
    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    return !!(creds?.username && creds?.partnerPassword && creds?.accountNo);
  }

  async charge(req: PaymentChargeRequest): Promise<PaymentChargeResult> {
    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException(
        'MoMo (IntouchPay) credentials are not configured. Go to Admin → Settings → Payments → Credentials to set them up.',
      );
    }
    if (!req.payer.phone) {
      throw new BadRequestException('A mobile phone number is required for a MoMo payment.');
    }

    const fallbackCallback = `${this.config.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;

    const result = await this.intouchPay.requestPayment({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      amount: req.amount,
      mobilePhone: req.payer.phone,
      transactionId: req.transactionId,
      reason: req.description ?? 'RMC Payment',
      callbackUrl: creds.callbackUrl || fallbackCallback,
      gatewayUrl: creds.gatewayUrl || undefined,
    });

    return {
      provider: 'intouchpay',
      status: result.status,
      providerReference: result.transactionId
        ? `${req.transactionId}|${result.transactionId}`
        : req.transactionId,
      transactionId: req.transactionId,
      responseCode: result.responseCode,
      message: result.message,
      raw: result.raw,
    };
  }

  /** `reference` is the stored `requestTxnId|gatewayTxnId` pair (gateway id optional). */
  async getStatus(reference: string): Promise<PaymentStatusResult> {
    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('IntouchPay credentials are not configured.');
    }

    const [requestTxnId, gatewayTxnId] = reference.split('|');
    const result = await this.intouchPay.getTransactionStatus({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      requestTransactionId: requestTxnId,
      transactionId: gatewayTxnId || requestTxnId,
      gatewayBaseUrl: creds.gatewayUrl || undefined,
    });

    return {
      status: result.status,
      providerReference: reference,
      providerPaymentMethod: 'MOMO',
      responseCode: result.responseCode,
      message: result.message,
      paidAt: result.status === 'SUCCESSFUL' ? new Date() : undefined,
    };
  }
}
