import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';
import { PaymentSettingsService } from '../../payment-settings/payment-settings.service';
import { SettingsCacheBus } from '../../payment-settings/settings-cache.bus';
import { IremboLanguage } from './irembo-pay.types';

export interface IremboPayConfig {
  secretKey: string;
  publicKey: string;
  paymentAccountIdentifier: string;
  /** Optional second account for USD-denominated invoices. */
  paymentAccountIdentifierUsd: string;
  /** Host only — the client appends `/payments/...`. */
  apiBaseUrl: string;
  widgetScriptUrl: string;
  apiVersion: string;
  invoiceExpiryMinutes: number;
  defaultLanguage: IremboLanguage;
  signatureToleranceSeconds: number;
  isTestMode: boolean;
}

const SANDBOX_API = 'https://api.sandbox.irembopay.com';
const PRODUCTION_API = 'https://api.irembopay.com';
const SANDBOX_WIDGET = 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js';
const PRODUCTION_WIDGET = 'https://dashboard.irembopay.com/assets/payment/inline.js';

const DEFAULTS = {
  apiVersion: '3',
  invoiceExpiryMinutes: 1440,
  defaultLanguage: 'EN' as IremboLanguage,
  signatureToleranceSeconds: 300,
};

/** How long a resolved config is trusted before re-reading the settings row. */
const CACHE_TTL_MS = 60_000;

/**
 * Resolves IremboPay configuration from the database at runtime.
 *
 * Nothing here is read from the environment or from a constant: every value is
 * an admin-editable settings field, which is what makes sandbox → production a
 * toggle rather than a deploy. The cache exists only to keep a burst of charges
 * from hammering the settings table; `invalidate()` makes a save take effect on
 * the very next call.
 */
@Injectable()
export class IremboPayConfigService {
  private readonly logger = new Logger(IremboPayConfigService.name);
  private cache: { value: IremboPayConfig; expiresAt: number } | null = null;

  constructor(
    private readonly paymentSettings: PaymentSettingsService,
    cacheBus: SettingsCacheBus,
  ) {
    // A saved credential must take effect on the very next call, not when the
    // 60-second cache happens to expire.
    cacheBus.onMethodSettingsChanged((code) => {
      if (code === PaymentMethodCode.IREMBOPAY) this.invalidate();
    });
  }

  /** Drops the cache. Called whenever the settings row is written. */
  invalidate(): void {
    this.cache = null;
  }

  async get(): Promise<IremboPayConfig> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.value;

    // Raw, not masked: the masked variant would send '••••••••' as the API key.
    //
    // Read regardless of whether the method is active. Deactivating IremboPay is
    // how a rollback is performed, and invoices issued beforehand keep being paid
    // afterwards — a bank payment settles days later. Without the key we could
    // neither verify those webhooks nor reconcile them, and the money would be
    // lost. Whether new charges may start is decided by `PaymentGatewayService`,
    // which does check `isActive`.
    const raw =
      (await this.paymentSettings.getRawSettings(PaymentMethodCode.IREMBOPAY, false)) ?? {};
    const record = await this.paymentSettings.getMethodSettingsRecord(
      PaymentMethodCode.IREMBOPAY,
      false,
    );
    const isTestMode = record?.isTestMode ?? true;

    const value: IremboPayConfig = {
      secretKey: (raw.secretKey ?? '').trim(),
      publicKey: (raw.publicKey ?? '').trim(),
      paymentAccountIdentifier: (raw.paymentAccountIdentifier ?? '').trim(),
      paymentAccountIdentifierUsd: (raw.paymentAccountIdentifierUsd ?? '').trim(),
      apiBaseUrl: stripTrailingSlash(
        raw.apiBaseUrl?.trim() || (isTestMode ? SANDBOX_API : PRODUCTION_API),
      ),
      widgetScriptUrl:
        raw.widgetScriptUrl?.trim() || (isTestMode ? SANDBOX_WIDGET : PRODUCTION_WIDGET),
      apiVersion: raw.apiVersion?.trim() || DEFAULTS.apiVersion,
      invoiceExpiryMinutes: positiveInt(raw.invoiceExpiryMinutes, DEFAULTS.invoiceExpiryMinutes),
      defaultLanguage: asLanguage(raw.defaultLanguage),
      signatureToleranceSeconds: positiveInt(
        raw.signatureToleranceSeconds,
        DEFAULTS.signatureToleranceSeconds,
      ),
      isTestMode,
    };

    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  async isConfigured(): Promise<boolean> {
    const c = await this.get();
    return !!(c.secretKey && c.publicKey && c.paymentAccountIdentifier);
  }

  /** The payment account for a currency, falling back to the RWF one. */
  async accountForCurrency(currency = 'RWF'): Promise<string> {
    const c = await this.get();
    if (currency.toUpperCase() === 'USD' && c.paymentAccountIdentifierUsd) {
      return c.paymentAccountIdentifierUsd;
    }
    return c.paymentAccountIdentifier;
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function asLanguage(value: string | undefined): IremboLanguage {
  const v = (value ?? '').toUpperCase();
  return v === 'FR' || v === 'RW' ? v : DEFAULTS.defaultLanguage;
}
