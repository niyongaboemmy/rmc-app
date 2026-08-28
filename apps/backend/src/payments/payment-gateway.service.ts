import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { IremboPayProvider } from './providers/irembo-pay.provider';
import {
  PaymentChargeRequest,
  PaymentChargeResult,
  PaymentGatewayProvider,
  PaymentStatusResult,
} from './payment-gateway.port';

const SETTINGS_PAGE = 'Admin → Settings → Payments';

/** Routing overrides. The default — no options — is the production path. */
export interface GatewayRouteOptions {
  /**
   * Route to a provider that is configured but not yet switched on.
   *
   * Exists for one caller: the settings test panel, which has to prove a set of
   * credentials works *before* an admin activates the method. Everything that
   * takes money from a real payer leaves this unset, so the active toggle still
   * governs live charges.
   */
  allowInactive?: boolean;
}

/**
 * Routes a neutral charge request to whichever gateway is configured.
 *
 * Resolution order:
 *   1. the explicit `methodCode` argument;
 *   2. the single active + configured method, when there is exactly one;
 *   3. otherwise the lowest `sortOrder` among the active + configured ones;
 *   4. failing all of that, a BadRequest naming the settings page — an
 *      unconfigured gateway is an admin problem, not a 500.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers = new Map<PaymentMethodCode, PaymentGatewayProvider>();

  constructor(
    irembo: IremboPayProvider,
    private readonly paymentSettings: PaymentSettingsService,
  ) {
    this.register(irembo);
  }

  register(provider: PaymentGatewayProvider): void {
    this.providers.set(provider.code, provider);
  }

  /** Registered provider codes, in registration order. */
  listProviders(): PaymentMethodCode[] {
    return [...this.providers.keys()];
  }

  async resolve(
    methodCode?: PaymentMethodCode | string,
    opts: GatewayRouteOptions = {},
  ): Promise<PaymentGatewayProvider> {
    const methods = await this.paymentSettings.findAllMethods();

    if (methodCode) {
      const provider = this.providers.get(methodCode as PaymentMethodCode);
      if (!provider) {
        throw new BadRequestException(
          `No payment gateway is available for "${methodCode}". Enable and configure it in ${SETTINGS_PAGE}.`,
        );
      }
      // An explicitly named method is still subject to the active toggle. The
      // provider's own credentials stay readable while it is off — that is what
      // lets in-flight invoices settle after a rollback — so "configured" is no
      // longer sufficient on its own to authorise taking new money.
      const method = methods.find((m) => m.code === provider.code);
      if (!method?.isActive && !opts.allowInactive) {
        throw new BadRequestException(
          `${provider.providerName} is not active. Enable it in ${SETTINGS_PAGE}.`,
        );
      }
      return provider;
    }

    const candidates = methods
      .filter((m) => m.isActive && this.providers.has(m.code))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const method of candidates) {
      const provider = this.providers.get(method.code) as PaymentGatewayProvider;
      if (await provider.isConfigured()) return provider;
    }

    throw new BadRequestException(
      `No payment gateway is active and configured. Set one up in ${SETTINGS_PAGE}.`,
    );
  }

  /**
   * Whether a charge would be accepted right now — i.e. some provider is both
   * active and configured.
   *
   * Callers use this to decide whether a record starts as PENDING (a gateway
   * will collect the money) or as already settled (recorded manually). Asking
   * one named provider instead would mean that switching providers silently
   * flips genuine payments into "no gateway, assume paid".
   */
  async canCharge(methodCode?: PaymentMethodCode | string): Promise<boolean> {
    try {
      const provider = await this.resolve(methodCode);
      return await provider.isConfigured();
    } catch {
      return false;
    }
  }

  async charge(
    req: PaymentChargeRequest,
    methodCode?: PaymentMethodCode | string,
    opts: GatewayRouteOptions = {},
  ): Promise<PaymentChargeResult> {
    const provider = await this.resolve(methodCode, opts);

    if (!(await provider.isConfigured())) {
      throw new BadRequestException(
        `${provider.providerName} is not configured. Add its credentials in ${SETTINGS_PAGE}.`,
      );
    }

    this.logger.log(
      `[Gateway] ${provider.providerName} charge ${req.amount} ${req.currency ?? 'RWF'} (txn: ${req.transactionId}, type: ${req.paymentTypeKey})`,
    );

    return provider.charge(req);
  }

  async getStatus(
    reference: string,
    methodCode?: PaymentMethodCode | string,
    opts: GatewayRouteOptions = {},
  ): Promise<PaymentStatusResult> {
    const provider = await this.resolve(methodCode, opts);
    return provider.getStatus(reference);
  }
}
