import { DataSource } from 'typeorm';

/**
 * Brings an environment's IremboPay settings row into a consistent state —
 * sandbox on a fresh environment, live on production.
 *
 * The secret and public keys are read from the environment (or kept from the
 * row an admin already filled in) and never defaulted. A live key committed to
 * a `.ts` file is a key in the git history permanently, and this repo being
 * private only narrows who can read it. Put it in the gitignored `.env`; the
 * seed tells you where to find it if it is missing.
 *
 * Which mode the row is in is decided by the KEYS, not by a flag someone has to
 * remember: IremboPay issues `pk_live_…`/`sk_live_…` for production and
 * `pk_test_…`/`sk_test_…` for the sandbox, and each pair only authenticates
 * against its own host. A live key left in test mode sends every call to
 * api.sandbox.irembopay.com, where it is rejected — and IremboPay's production
 * callbacks are signed with a key the sandbox never saw.
 *
 * Idempotent: credentials already on the row are never overwritten, so
 * re-running it can never replace production keys with sandbox ones. What it
 * does correct is configuration DERIVED from those keys — the test-mode flag,
 * sandbox URLs pinned on a live row, the callback URL, and sandbox product codes
 * left mapped on a live gateway.
 */
const SANDBOX = {
  paymentAccountIdentifier: 'RMC-RWF',
  productCode: 'PC-62d7108dd9',
  testMsisdn: '0781234567',
};

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

type KeyMode = 'live' | 'test' | null;

/** Enough of a key to confirm which one loaded, never enough to use it. */
function fingerprint(value: string): string {
  return value.length <= 8 ? '••••••••' : `${value.slice(0, 7)}…${value.slice(-2)}`;
}

/** `null` when neither key carries a recognisable prefix — the flag is then left alone. */
function keyMode(...keys: (string | undefined)[]): KeyMode {
  if (keys.some((k) => /^(pk|sk)_live_/.test(k ?? ''))) return 'live';
  if (keys.some((k) => /^(pk|sk)_test_/.test(k ?? ''))) return 'test';
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
  const envAccount = notPlaceholder(process.env.IREMBOPAY_ACCOUNT);
  const envProduct = notPlaceholder(process.env.IREMBOPAY_PRODUCT_CODE);
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

  // Credentials: whatever the row already holds wins over the environment.
  const secretKey = current.secretKey || envSecret;
  const publicKey = current.publicKey || envPublic;
  const mode = keyMode(publicKey, secretKey);
  const live = mode === 'live';

  const settings: Record<string, string> = {
    ...DEFAULTS,
    // A sandbox account name is meaningless on a live merchant, so it is only
    // defaulted when the keys are not live.
    ...(live
      ? {}
      : {
          paymentAccountIdentifier: SANDBOX.paymentAccountIdentifier,
          testMsisdn: SANDBOX.testMsisdn,
        }),
    ...(envAccount ? { paymentAccountIdentifier: envAccount } : {}),
    ...current,
    ...(secretKey ? { secretKey } : {}),
    ...(publicKey ? { publicKey } : {}),
  };
  delete settings.productCode; // mapped per payment type below, not a method setting

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

  const isTestMode: boolean = mode === null ? (existing?.is_test_mode ?? true) : !live;
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
    log(`test mode ${existing.is_test_mode ? 'ON → OFF' : 'OFF → ON'} to match the ${mode} keys`);
  }

  // Every payment type needs a product or it fails the moment a payer tries to
  // pay it. Sandbox product codes do not exist on the live merchant, so a live
  // gateway is never defaulted to one.
  const productCode = envProduct || (live ? '' : SANDBOX.productCode);
  let mapped = 0;
  let replaced = 0;

  if (productCode) {
    const inserted: unknown[] = await dataSource.query(
      `INSERT INTO payment_type_provider_products (provider, payment_type_id, product_code)
       SELECT 'irembopay', pt.id, $1
         FROM payment_types pt
        WHERE NOT EXISTS (
          SELECT 1 FROM payment_type_provider_products p
           WHERE p.provider = 'irembopay'
             AND p.payment_type_id = pt.id
             AND p.payment_type_rate_id IS NULL
        )
       RETURNING id`,
      [productCode],
    );
    mapped = inserted.length;

    if (live) {
      // Mappings an earlier sandbox seed left behind point at a product the live
      // merchant does not have. Only that exact code is replaced — a product an
      // admin chose in the Products tab is left alone.
      const updated: unknown[] = await dataSource.query(
        `UPDATE payment_type_provider_products
            SET product_code = $1, updated_at = now()
          WHERE provider = 'irembopay' AND product_code = $2
         RETURNING id`,
        [productCode, SANDBOX.productCode],
      );
      replaced = updated.length;
    }
  }

  if (live) {
    const [{ stale, unmapped }] = await dataSource.query(
      `SELECT
         (SELECT count(*) FROM payment_type_provider_products
           WHERE provider = 'irembopay' AND product_code = $1)::int AS stale,
         (SELECT count(*) FROM payment_types pt
           WHERE NOT EXISTS (
             SELECT 1 FROM payment_type_provider_products p
              WHERE p.provider = 'irembopay' AND p.payment_type_id = pt.id
                AND p.payment_type_rate_id IS NULL))::int AS unmapped`,
      [SANDBOX.productCode],
    );
    if (stale > 0 || unmapped > 0) {
      log(
        `WARNING: ${stale} mapping(s) still use sandbox product ${SANDBOX.productCode} and ` +
          `${unmapped} payment type(s) have none. Set IREMBOPAY_PRODUCT_CODE to the live ` +
          'product (portal → Products) and re-run, or fix them in the Products tab.',
      );
    }
  }

  log(
    `configured — ${live ? 'LIVE' : isTestMode ? 'sandbox' : 'production'} mode, ` +
      `account=${settings.paymentAccountIdentifier ?? '(unset)'}, ` +
      `secret=${fingerprint(settings.secretKey ?? '')}, ` +
      `${mapped} payment type(s) mapped${replaced ? `, ${replaced} sandbox mapping(s) replaced` : ''}` +
      (productCode ? ` to ${productCode}` : ''),
  );
  log(
    `callback URL for the IremboPay portal: ${settings.callbackUrl ?? `<APP_URL>${WEBHOOK_PATH}`}`,
  );
  if (!isConfigured) {
    log('incomplete — secret key, public key and payment account are all required.');
  }
}
