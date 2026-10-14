import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';
import { ProviderEnvironment } from '../../payment-settings/entities/payment-type-provider-product.entity';
import { PaymentSettingsService } from '../../payment-settings/payment-settings.service';
import { iremboPayFieldsFor, iremboPayReady } from '../../payment-settings/irembopay-fields';
import { SettingsCacheBus } from '../../payment-settings/settings-cache.bus';
import {
  DEFAULT_SIMULATOR_DELAY_MS,
  IREMBO_SIMULATOR_MODES,
  IremboLanguage,
  IremboSimulatorMode,
} from './irembo-pay.types';

export interface IremboPayConfig {
  secretKey: string;
  publicKey: string;
  /** The RWF account (production `RMC_RWF`, sandbox `RMC-RWF`). Required. */
  paymentAccountIdentifier: string;
  /** USD account (`RMC_USD`). Optional — without it, USD charges are refused. */
  paymentAccountIdentifierUsd: string;
  /** EUR account (`RMC_EUR`). Optional — without it, EUR charges are refused. */
  paymentAccountIdentifierEur: string;
  /** Host only — the client appends `/payments/...`. */
  apiBaseUrl: string;
  widgetScriptUrl: string;
  apiVersion: string;
  invoiceExpiryMinutes: number;
  defaultLanguage: IremboLanguage;
  signatureToleranceSeconds: number;
  isTestMode: boolean;
  /** `isTestMode` as a merchant name — selects product mappings and invoices. */
  environment: ProviderEnvironment;
  /**
   * Answer payments locally instead of calling IremboPay. Honoured only in test
   * mode and never in production — see `IremboPaySandboxService.isActive()`.
   */
  simulatorMode: IremboSimulatorMode;
  /** How long the simulated payer takes to approve. */
  simulatorDelayMs: number;
  /**
   * IremboPay's limits for the RMC merchant, per currency: the largest single
   * invoice, and the most it will process in a day. Admin-editable; the
   * defaults are the values IremboPay gave for the production merchant.
   */
  limits: Record<'RWF' | 'USD' | 'EUR', { perTransaction: number; daily: number }>;
  /**
   * The number the admin test panel pushes to by default. In the sandbox only
   * IremboPay's own test MSISDN is accepted, and which one that is belongs with
   * the rest of the gateway's settings rather than in an env file nobody can
   * edit once the app is deployed.
   */
  testMsisdn: string;
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
  // IremboPay's documented sandbox test number — the only one their sandbox
  // accepts a push for.
  testMsisdn: '0781234567',
};

/**
 * IremboPay production limits for merchant RWANDA MUSLIM COMMUNITY (Oct 2026):
 * maximum per transaction, and maximum processed per day.
 */
export const DEFAULT_LIMITS = {
  RWF: { perTransaction: 50_000_000, daily: 100_000_000 },
  USD: { perTransaction: 100_000, daily: 300_000 },
  EUR: { perTransaction: 100_000, daily: 300_000 },
} as const;

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
  /** Set alongside the cache by get(): the live merchant has usable credentials. */
  private ready = false;

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
    const environment = isTestMode ? 'sandbox' : 'production';
    // The row holds both merchants' keys and accounts; Test mode picks one.
    const merchant = iremboPayFieldsFor(raw, environment);
    this.ready = iremboPayReady(raw, environment);

    const value: IremboPayConfig = {
      secretKey: merchant.secretKey,
      publicKey: merchant.publicKey,
      paymentAccountIdentifier: merchant.accountRwf,
      paymentAccountIdentifierUsd: merchant.accountUsd,
      paymentAccountIdentifierEur: merchant.accountEur,
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
      environment,
      simulatorMode: asSimulatorMode(raw.simulatorMode),
      simulatorDelayMs: positiveInt(raw.simulatorDelayMs, DEFAULT_SIMULATOR_DELAY_MS),
      testMsisdn: raw.testMsisdn?.trim() || DEFAULTS.testMsisdn,
      limits: {
        RWF: limitsFor(raw, 'Rwf', DEFAULT_LIMITS.RWF),
        USD: limitsFor(raw, 'Usd', DEFAULT_LIMITS.USD),
        EUR: limitsFor(raw, 'Eur', DEFAULT_LIMITS.EUR),
      },
    };

    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  async isConfigured(): Promise<boolean> {
    const c = await this.get();
    // A simulated gateway needs no credentials — that is the whole point of it.
    // Reporting "not configured" here would send every charge down the
    // no-gateway branch and defeat the simulation.
    if (this.simulationRequested(c)) return true;
    if (!this.ready && c.environment === 'production' && c.secretKey) {
      this.logger.warn(
        '[IremboPay] Production is selected but its secret key equals the sandbox one — ' +
          'treated as not configured. Paste the production keys in Admin → Settings → Payments.',
      );
    }
    return this.ready;
  }

  /** Whether payments are being answered locally rather than by IremboPay. */
  async isSimulated(): Promise<boolean> {
    return this.simulationRequested(await this.get());
  }

  private simulationRequested(c: IremboPayConfig): boolean {
    return process.env.NODE_ENV !== 'production' && c.isTestMode && c.simulatorMode !== 'off';
  }

  /**
   * The payment account for a currency.
   *
   * Never falls back to another currency's account. On IremboPay the account
   * *is* the currency, so the old "fall back to RWF" made a €50 donation a
   * 50 RWF invoice — silently, since IremboPay has no way to know we meant
   * euros. A currency with no account is refused instead, naming the setting.
   */
  async accountForCurrency(currency = 'RWF'): Promise<string> {
    const c = await this.get();
    const ccy = currency.trim().toUpperCase();
    const account =
      ccy === 'RWF'
        ? c.paymentAccountIdentifier
        : ccy === 'USD'
          ? c.paymentAccountIdentifierUsd
          : ccy === 'EUR'
            ? c.paymentAccountIdentifierEur
            : '';
    if (!account) {
      throw new BadRequestException(
        `IremboPay has no ${ccy} payment account configured, so ${ccy} payments cannot be taken. ` +
          `Set it in Admin → Settings → Payments → IremboPay.`,
      );
    }
    return account;
  }
}

/** `maxTransactionRwf` / `maxDailyRwf` from the settings row, or the default. */
function limitsFor(
  raw: Record<string, string>,
  suffix: 'Rwf' | 'Usd' | 'Eur',
  fallback: { perTransaction: number; daily: number },
): { perTransaction: number; daily: number } {
  return {
    perTransaction: positiveInt(raw[`maxTransaction${suffix}`], fallback.perTransaction),
    daily: positiveInt(raw[`maxDaily${suffix}`], fallback.daily),
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function asSimulatorMode(value: string | undefined): IremboSimulatorMode {
  const v = (value ?? '').trim().toLowerCase() as IremboSimulatorMode;
  return IREMBO_SIMULATOR_MODES.includes(v) ? v : 'off';
}

function asLanguage(value: string | undefined): IremboLanguage {
  const v = (value ?? '').toUpperCase();
  return v === 'FR' || v === 'RW' ? v : DEFAULTS.defaultLanguage;
}
