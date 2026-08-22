import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { IremboPayConfigService } from '../integrations/irembo-pay/irembo-pay.config.service';
import { IREMBOPAY_PROVIDER_KEY } from './providers/irembo-pay.provider';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../payment-settings/entities/payment-transaction.entity';
import { GatewayStatus } from './payment-gateway.port';

/** What the browser needs to render the right payment UI. Never any secret. */
export interface PublicPaymentConfig {
  /** 'irembopay' | 'intouchpay', or null when nothing is active and configured. */
  provider: string | null;
  /** True when the payer can settle by card or bank through the hosted widget. */
  supportsWidget: boolean;
  /** True when we can push a MoMo prompt to a phone number. */
  supportsMomoPush: boolean;
  /** Widget credentials — public by design; the secret key never leaves the server. */
  publicKey?: string;
  widgetScriptUrl?: string;
}

/**
 * The payer-facing slice of the payments API.
 *
 * Separate from `IremboPayAdminController` because everything here is
 * `@Public()` — called by donors and applicants who have no account. That makes
 * the response contents a security question, not merely an API-design one,
 * which is why this builds an explicit config object instead of returning any
 * part of the settings row.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsPublicController {
  constructor(
    private readonly gateway: PaymentGatewayService,
    private readonly iremboConfig: IremboPayConfigService,
    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
  ) {}

  /**
   * Tells the browser which gateway is live and what it can offer, so the
   * payment UI follows the admin's settings rather than hardcoding a provider.
   */
  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Payer-facing payment capabilities (no secrets)' })
  async config(): Promise<PublicPaymentConfig> {
    let provider;
    try {
      provider = await this.gateway.resolve();
    } catch {
      // Nothing active and configured. The caller renders its manual-payment
      // fallback instead of an error — a payer should never see a 500 because
      // an admin has not finished setting up a gateway.
      return { provider: null, supportsWidget: false, supportsMomoPush: false };
    }

    if (provider.code !== PaymentMethodCode.IREMBOPAY) {
      return { provider: 'intouchpay', supportsWidget: false, supportsMomoPush: true };
    }

    const cfg = await this.iremboConfig.get();
    return {
      provider: IREMBOPAY_PROVIDER_KEY,
      supportsWidget: true,
      supportsMomoPush: true,
      publicKey: cfg.publicKey,
      widgetScriptUrl: cfg.widgetScriptUrl,
    };
  }

  /**
   * The authoritative status of one payment attempt.
   *
   * The widget's callback runs on the payer's machine and cannot be trusted, so
   * the browser polls this after the modal closes. It deliberately returns
   * nothing but a status: transaction ids are semi-guessable
   * (`MAR-<applicationNumber>-<timestamp>`), and returning amounts, phone
   * numbers or payer names would turn that into an enumeration leak.
   *
   * An unknown id reads as PENDING rather than 404, so a caller polling during
   * the window between charge and ledger write does not give up early — and so
   * a prober cannot use this to test whether an id exists.
   */
  @Public()
  @Get('status/:transactionId')
  @ApiOperation({ summary: 'Backend-confirmed status of a payment attempt' })
  async status(@Param('transactionId') transactionId: string): Promise<{ status: GatewayStatus }> {
    const tx = await this.txRepo.findOne({
      where: { requestTransactionId: transactionId },
      select: { id: true, status: true },
    });

    if (!tx) return { status: 'PENDING' };

    if (tx.status === PaymentTransactionStatus.SUCCESSFUL) return { status: 'SUCCESSFUL' };
    if (
      tx.status === PaymentTransactionStatus.FAILED ||
      tx.status === PaymentTransactionStatus.CANCELLED
    ) {
      return { status: 'FAILED' };
    }
    return { status: 'PENDING' };
  }
}
