import { DataSource } from 'typeorm';
import { PRODUCTION_ACCOUNTS, SANDBOX_CATALOG } from './10-irembopay-catalog.seed';
import {
  IREMBOPAY_FIELD_KEYS,
  IremboPayEnvironment,
  iremboPayFieldsFor,
  iremboPayReady,
} from '../../payment-settings/irembopay-fields';

/**
 * Brings an environment's IremboPay settings row into a consistent state.
 * Product mappings are `10-irembopay-catalog.seed.ts`'s job, not this one's.
 *
 * The row holds both merchants side by side — production in the unprefixed
 * fields, sandbox in the `sandbox*` ones (see `irembopay-fields.ts`) — and Test
 * mode picks which is live. This seed fills in everything about the production
 * merchant that is not secret (its payment accounts and IremboPay's limits), so
 * the admin form shows the production configuration in full; the keys are the
 * one thing it never defaults.
 *
 * Keys are read from the environment and never committed: a key in a `.ts`
 * file is in the git history permanently. They go into the fields of the
 * merchant IREMBOPAY_MODE names (or the row's current one when unset), and
 * replace what is there only under an explicit mode.
 *
 * The mode is never guessed. IremboPay's SANDBOX issues `pk_live_…` keys too,
 * so the key prefix says nothing about which host the keys belong to. Instead:
 *
 *   IREMBOPAY_MODE=production   → test mode off; refused without production keys
 *   IREMBOPAY_MODE=sandbox      → test mode on
 *   (unset)                     → whatever the row already says (new rows: sandbox)
 *
 * Idempotent; safe to re-run from the seed workflow.
 */

/** Non-secret defaults that hold in either mode. */
const DEFAULTS = {
  apiVersion: '3',
  invoiceExpiryMinutes: '1440',
  defaultLanguage: 'EN',
  signatureToleranceSeconds: '300',
  simulatorMode: 'off',
  testMsisdn: '0781234567',
};

/** IremboPay's limits for merchant RWANDA MUSLIM COMMUNITY (Oct 2026). */
const PRODUCTION_LIMITS = {
  maxTransactionRwf: '50000000',
  maxDailyRwf: '100000000',
  maxTransactionUsd: '100000',
  maxDailyUsd: '300000',
  maxTransactionEur: '100000',
  maxDailyEur: '300000',
};

/** Served behind `app.setGlobalPrefix('api/v1')` — see `WebhooksController`. */
const WEBHOOK_PATH = '/api/v1/webhooks/irembopay';

type Mode = IremboPayEnvironment | null;

/** Enough of a key to confirm which one loaded, never enough to use it. */
function fingerprint(value: string): string {
  if (!value) return '(none)';
  return value.length <= 8 ? '••••••••' : `${value.slice(0, 7)}…${value.slice(-2)}`;
}

/** `null` when IREMBOPAY_MODE is unset or unrecognised — the row's flag is then kept. */
function requestedMode(value: string | undefined): Mode {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'production' || v === 'live') return 'production';
  if (v === 'sandbox' || v === 'test') return 'sandbox';
  return null;
}

/**
 * A `.env` copied from a template often still says `REPLACE_ME`. Trusted as a
 * value it would break every payment at once — so it is treated as unset.
 */
function notPlaceholder(value: string | undefined): string {
  const v = (value ?? '').trim();
  return /replace|change|your|todo|xxx|<|>/i.test(v) ? '' : v;
}

export async function seedIremboPay(dataSource: DataSource): Promise<void> {
  const log = (msg: string): void => {
    // eslint-disable-next-line no-console
    console.log(`[Seed] IremboPay — ${msg}`);
  };

  const envSecret = notPlaceholder(process.env.IREMBOPAY_SECRET_KEY);
  const envPublic = notPlaceholder(process.env.IREMBOPAY_PUBLIC_KEY);
  const envAccounts = {
    accountRwf:
      notPlaceholder(process.env.IREMBOPAY_ACCOUNT_RWF) ||
      notPlaceholder(process.env.IREMBOPAY_ACCOUNT),
    accountUsd: notPlaceholder(process.env.IREMBOPAY_ACCOUNT_USD),
    accountEur: notPlaceholder(process.env.IREMBOPAY_ACCOUNT_EUR),
  };
  const appUrl = (process.env.APP_URL ?? '').trim().replace(/\/+$/, '');

  const [method] = await dataSource.query(
    `SELECT id FROM payment_methods WHERE code = 'IREMBOPAY' LIMIT 1`,
  );
  if (!method) {
    log('no IREMBOPAY payment method row — run the migrations first.');
    return;
  }

  const [existing] = await dataSource.query(
    `SELECT settings, is_test_mode FROM payment_method_settings WHERE payment_method_id = $1 LIMIT 1`,
    [method.id],
  );
  const current: Record<string, string> = existing?.settings ?? {};

  // A test-mode row whose sandbox keys still sit in the production fields has
  // not been through migration 082. Writing production values now would put
  // them where the running (old) code reads its sandbox values.
  const legacy =
    existing?.is_test_mode !== false &&
    !!current.secretKey &&
    !current.sandboxSecretKey &&
    !current.sandboxPublicKey;
  if (existing && legacy) {
    log('settings predate migration 082 (one field set) — run the migrations, then this seed.');
    return;
  }

  const mode = requestedMode(process.env.IREMBOPAY_MODE);
  const target: IremboPayEnvironment =
    mode ?? (existing ? (existing.is_test_mode === false ? 'production' : 'sandbox') : 'sandbox');
  const keys = IREMBOPAY_FIELD_KEYS[target];

  const settings: Record<string, string> = { ...DEFAULTS, ...PRODUCTION_LIMITS, ...current };
  delete settings.productCode; // a mapping, not a method setting — see the catalog seed
  delete settings.credentialsFor; // retired with the per-merchant fields

  // Keys go into the target merchant's fields. Existing ones are replaced only
  // under an explicit mode, so a stale .env cannot overwrite what an admin set.
  if (envSecret && envPublic) {
    const changed =
      settings[keys.secretKey] !== envSecret || settings[keys.publicKey] !== envPublic;
    const empty = !settings[keys.secretKey] && !settings[keys.publicKey];
    if (changed && (mode !== null || empty)) {
      if (settings[keys.secretKey]) {
        log(
          `${target} keys replaced: secret ${fingerprint(settings[keys.secretKey])} → ` +
            `${fingerprint(envSecret)}, public ${fingerprint(settings[keys.publicKey] ?? '')} → ` +
            `${fingerprint(envPublic)}`,
        );
      }
      settings[keys.secretKey] = envSecret;
      settings[keys.publicKey] = envPublic;
    }
  } else if (envSecret || envPublic) {
    log('only one of IREMBOPAY_SECRET_KEY / IREMBOPAY_PUBLIC_KEY is set — keys left unchanged.');
  }

  // Accounts from the environment are a correction for the target merchant.
  for (const [field, value] of Object.entries(envAccounts) as [
    keyof typeof envAccounts,
    string,
  ][]) {
    if (value) settings[keys[field]] = value;
  }

  // What is known about each merchant, filled in where empty.
  const prod = IREMBOPAY_FIELD_KEYS.production;
  if (!settings[prod.accountRwf]) settings[prod.accountRwf] = PRODUCTION_ACCOUNTS.RWF;
  if (!settings[prod.accountUsd]) settings[prod.accountUsd] = PRODUCTION_ACCOUNTS.USD;
  if (!settings[prod.accountEur]) settings[prod.accountEur] = PRODUCTION_ACCOUNTS.EUR;
  const sbx = IREMBOPAY_FIELD_KEYS.sandbox;
  if (!settings[sbx.accountRwf]) settings[sbx.accountRwf] = SANDBOX_CATALOG.account;

  // Going live is refused without production keys — otherwise live mode would
  // either have no keys or send sandbox ones to the production host.
  if (mode === 'production' && !iremboPayReady(settings, 'production')) {
    log(
      'REFUSED: IREMBOPAY_MODE=production, but the production keys are missing (or equal the ' +
        'sandbox ones). Put IREMBOPAY_SECRET_KEY and IREMBOPAY_PUBLIC_KEY from the production ' +
        'portal (Integration Details → View Token) in .env, or paste them in Admin → Settings → ' +
        'Payments. Nothing was changed.',
    );
    return;
  }

  const isTestMode = mode ? mode === 'sandbox' : existing ? existing.is_test_mode !== false : true;
  const live = !isTestMode;

  if (live) {
    // Pinned sandbox hosts override the mode-derived ones in
    // `IremboPayConfigService` — on a live row they must go.
    for (const key of ['apiBaseUrl', 'widgetScriptUrl'] as const) {
      if (/sandbox/i.test(settings[key] ?? '')) delete settings[key];
    }
    // Ignored outside development anyway; stored as 'off' so the admin panel
    // never shows a live gateway as "simulated".
    settings.simulatorMode = 'off';
  }

  // Display-only: IremboPay takes the callback URL from the portal, not per
  // request. Derived from APP_URL so the admin panel shows the URL to paste.
  if (appUrl) settings.callbackUrl = `${appUrl}${WEBHOOK_PATH}`;

  const environment: IremboPayEnvironment = live ? 'production' : 'sandbox';
  const isConfigured = iremboPayReady(settings, environment);

  if (existing) {
    await dataSource.query(
      `UPDATE payment_method_settings
         SET settings = $1, is_test_mode = $2, is_configured = $3, updated_at = now()
       WHERE payment_method_id = $4`,
      [JSON.stringify(settings), isTestMode, isConfigured, method.id],
    );
  } else {
    await dataSource.query(
      `INSERT INTO payment_method_settings (payment_method_id, settings, is_test_mode, is_configured)
       VALUES ($1, $2, $3, $4)`,
      [method.id, JSON.stringify(settings), isTestMode, isConfigured],
    );
  }

  if (existing && existing.is_test_mode !== isTestMode) {
    log(`test mode ${existing.is_test_mode ? 'ON → OFF' : 'OFF → ON'} (IREMBOPAY_MODE=${mode})`);
  }

  const describe = (env: IremboPayEnvironment): string => {
    const f = iremboPayFieldsFor(settings, env);
    return (
      `accounts RWF=${f.accountRwf || '-'} USD=${f.accountUsd || '-'} EUR=${f.accountEur || '-'}, ` +
      `secret=${fingerprint(f.secretKey)}, public=${fingerprint(f.publicKey)}, ` +
      `ready=${iremboPayReady(settings, env) ? 'yes' : 'NO'}`
    );
  };
  log(`live merchant: ${live ? 'PRODUCTION' : 'sandbox'} (test mode ${isTestMode ? 'on' : 'off'})`);
  log(`production — ${describe('production')}`);
  log(`sandbox    — ${describe('sandbox')}`);
  log(
    `limits RWF ${settings.maxTransactionRwf}/${settings.maxDailyRwf}, ` +
      `USD ${settings.maxTransactionUsd}/${settings.maxDailyUsd}, ` +
      `EUR ${settings.maxTransactionEur}/${settings.maxDailyEur} (per payment / per day)`,
  );
  log(
    `callback URL for the IremboPay portal: ${settings.callbackUrl ?? `<APP_URL>${WEBHOOK_PATH}`}`,
  );
  if (!isConfigured) {
    log(
      `the live merchant (${environment}) has no usable keys yet — payments are refused until it does.`,
    );
  }
}
