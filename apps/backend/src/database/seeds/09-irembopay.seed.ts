import { DataSource } from 'typeorm';
import { PRODUCTION_ACCOUNTS, SANDBOX_CATALOG } from './10-irembopay-catalog.seed';

/**
 * Brings an environment's IremboPay settings row into a consistent state —
 * sandbox on a fresh environment, live on production. Product mappings are
 * `10-irembopay-catalog.seed.ts`'s job, not this one's.
 *
 * The secret and public keys are read from the environment (or kept from the
 * row an admin already filled in) and never defaulted. A live key committed to
 * a `.ts` file is a key in the git history permanently, and this repo being
 * private only narrows who can read it. Put it in the gitignored `.env`; the
 * seed tells you where to find it if it is missing.
 *
 * The mode is never guessed. IremboPay's SANDBOX issues `pk_live_…` keys too,
 * so the key prefix says nothing about which host the keys belong to — reading
 * it as "production" once pointed sandbox keys at the live API. Instead:
 *
 *   IREMBOPAY_MODE=production   → test mode off, production accounts
 *   IREMBOPAY_MODE=sandbox      → test mode on
 *   (unset)                     → whatever the row already says (new rows: sandbox)
 *
 * so an admin's Test-mode toggle survives every re-run unless the environment
 * explicitly says otherwise.
 *
 * Idempotent. Credentials on the row win over the environment — so a re-run
 * with a stale .env can never put sandbox keys over production ones — with one
 * exception: under an explicit IREMBOPAY_MODE, keys in the environment that
 * differ from the row replace it, and are recorded as belonging to that mode.
 * That is the cutover itself (sandbox keys on the row, production keys just put
 * in .env) and its rollback, and it needs the explicit mode, never a default.
 * What it also corrects is configuration derived from the mode — the test-mode
 * flag, sandbox URLs or the other merchant's accounts left on the row, and the
 * callback URL.
 */
const SANDBOX = {
  paymentAccountIdentifier: SANDBOX_CATALOG.account,
  testMsisdn: '0781234567',
};

/** Settings field holding each currency's payment account. */
const ACCOUNT_FIELDS = {
  RWF: 'paymentAccountIdentifier',
  USD: 'paymentAccountIdentifierUsd',
  EUR: 'paymentAccountIdentifierEur',
} as const;

/** Non-secret defaults that hold in either mode. */
const DEFAULTS = {
  apiVersion: '3',
  invoiceExpiryMinutes: '1440',
  defaultLanguage: 'EN',
  signatureToleranceSeconds: '300',
  simulatorMode: 'off',
};

/** Served behind `app.setGlobalPrefix('api/v1')` — see `WebhooksController`. */
const WEBHOOK_PATH = '/api/v1/webhooks/irembopay';

type Mode = 'production' | 'sandbox' | null;

/** Enough of a key to confirm which one loaded, never enough to use it. */
function fingerprint(value: string): string {
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
 * A `.env` copied from a template often still says `REPLACE_ME`. Mapped as a
 * product code, that would break every payment type at once — so it is treated
 * as unset rather than trusted.
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

  const envSecret = (process.env.IREMBOPAY_SECRET_KEY ?? '').trim();
  const envPublic = (process.env.IREMBOPAY_PUBLIC_KEY ?? '').trim();
  const envAccounts = {
    RWF:
      notPlaceholder(process.env.IREMBOPAY_ACCOUNT_RWF) ||
      notPlaceholder(process.env.IREMBOPAY_ACCOUNT),
    USD: notPlaceholder(process.env.IREMBOPAY_ACCOUNT_USD),
    EUR: notPlaceholder(process.env.IREMBOPAY_ACCOUNT_EUR),
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

  if (!envSecret && !current.secretKey) {
    log(
      'no credentials. Add IREMBOPAY_SECRET_KEY and IREMBOPAY_PUBLIC_KEY to your ' +
        'gitignored .env (portal → Integrations Details → View Token), then re-run ' +
        'this seed — or enter them in Admin → Settings → Payments.',
    );
    return;
  }

  const mode = requestedMode(process.env.IREMBOPAY_MODE);
  const live = mode === 'production' || (mode === null && existing?.is_test_mode === false);

  // Credentials: whatever the row already holds wins over the environment,
  // except when a mode is named explicitly (see the header).
  const replaceKeys =
    mode !== null &&
    !!envSecret &&
    !!envPublic &&
    (envSecret !== current.secretKey || envPublic !== current.publicKey);

  // Going live is refused unless the keys are known to be production keys:
  // supplied now, or written by an earlier production run. Otherwise the row
  // still holds sandbox keys, and live mode would send them to the production
  // host — every charge a 401. The prefix cannot tell us (the sandbox issues
  // `_live_` keys), so provenance is recorded instead.
  if (mode === 'production' && !replaceKeys && current.credentialsFor !== 'production') {
    log(
      'REFUSED: IREMBOPAY_MODE=production, but no production keys. Put both ' +
        'IREMBOPAY_SECRET_KEY and IREMBOPAY_PUBLIC_KEY (production portal → Integration ' +
        'Details → View Token) in .env and re-run. Nothing was changed.',
    );
    return;
  }
  const secretKey = replaceKeys ? envSecret : current.secretKey || envSecret;
  const publicKey = replaceKeys ? envPublic : current.publicKey || envPublic;
  if (replaceKeys && current.secretKey) {
    log(
      `keys replaced for ${mode}: secret ${fingerprint(current.secretKey)} → ${fingerprint(envSecret)}, ` +
        `public ${fingerprint(current.publicKey ?? '')} → ${fingerprint(envPublic)}`,
    );
  }

  const settings: Record<string, string> = {
    ...DEFAULTS,
    // A sandbox account name is meaningless on a live merchant, so it is only
    // defaulted when not live.
    ...(live
      ? {}
      : {
          paymentAccountIdentifier: SANDBOX.paymentAccountIdentifier,
          testMsisdn: SANDBOX.testMsisdn,
        }),
    ...current,
    ...(secretKey ? { secretKey } : {}),
    ...(publicKey ? { publicKey } : {}),
  };
  delete settings.productCode; // a mapping, not a method setting — see the catalog seed
  if (replaceKeys) settings.credentialsFor = mode as string;
  else if (!current.secretKey && envSecret)
    settings.credentialsFor = live ? 'production' : 'sandbox';

  // Accounts: the environment wins (it is how a value is corrected), then the
  // row, then the merchant's known accounts. The other merchant's account left
  // on the row (RMC-RWF on production, RMC_* on sandbox) is never "the row's
  // value" — IremboPay would answer PAYMENT_ACCOUNT_NOT_FOUND.
  const productionValues = Object.values(PRODUCTION_ACCOUNTS) as string[];
  for (const [currency, field] of Object.entries(ACCOUNT_FIELDS) as [
    keyof typeof ACCOUNT_FIELDS,
    string,
  ][]) {
    const fromEnv = envAccounts[currency];
    if (fromEnv) {
      settings[field] = fromEnv;
    } else if (live) {
      if (!settings[field] || settings[field] === SANDBOX.paymentAccountIdentifier) {
        settings[field] = PRODUCTION_ACCOUNTS[currency];
      }
    } else if (productionValues.includes(settings[field] ?? '')) {
      // The sandbox has an RWF account only.
      if (currency === 'RWF') settings[field] = SANDBOX.paymentAccountIdentifier;
      else delete settings[field];
    }
  }

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

  const isTestMode = !live;
  const isConfigured = ['secretKey', 'publicKey', 'paymentAccountIdentifier'].every(
    (f) => !!settings[f]?.trim(),
  );

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

  log(
    `configured — ${live ? 'PRODUCTION' : 'sandbox'} mode, ` +
      `accounts RWF=${settings.paymentAccountIdentifier ?? '(unset)'} ` +
      `USD=${settings.paymentAccountIdentifierUsd || '(unset)'} ` +
      `EUR=${settings.paymentAccountIdentifierEur || '(unset)'}, ` +
      `secret=${fingerprint(settings.secretKey ?? '')}, public=${fingerprint(settings.publicKey ?? '')}`,
  );
  log(
    `callback URL for the IremboPay portal: ${settings.callbackUrl ?? `<APP_URL>${WEBHOOK_PATH}`}`,
  );
  if (!isConfigured) {
    log('incomplete — secret key, public key and payment account are all required.');
  }
}
