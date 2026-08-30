import { DataSource } from 'typeorm';

/**
 * Brings a fresh environment up on the IremboPay sandbox.
 *
 * Everything here except the keys is sandbox configuration, not a credential:
 * the payment account and product code identify RMC's sandbox merchant objects
 * and are useless without a secret key, so they are defaulted in code to keep
 * `npm run seed` a one-step setup.
 *
 * The secret key is read from the environment and never defaulted. A live key
 * committed to a `.ts` file is a key in the git history permanently, and this
 * repo being private only narrows who can read it. Put it in the gitignored
 * `.env`; the seed tells you where to find it if it is missing.
 *
 * Idempotent: it fills in what is absent and leaves an already-configured
 * gateway alone, so re-running it can never overwrite production credentials
 * with sandbox ones.
 */
const SANDBOX = {
  paymentAccountIdentifier: process.env.IREMBOPAY_ACCOUNT || 'RMC-RWF',
  productCode: process.env.IREMBOPAY_PRODUCT_CODE || 'PC-62d7108dd9',
  apiVersion: '3',
  invoiceExpiryMinutes: '1440',
  defaultLanguage: 'EN',
  signatureToleranceSeconds: '300',
  testMsisdn: process.env.IREMBOPAY_TEST_MSISDN || '0781234567',
  simulatorMode: 'off',
};

/** Enough of a key to confirm which one loaded, never enough to use it. */
function fingerprint(value: string): string {
  return value.length <= 8 ? '••••••••' : `${value.slice(0, 7)}…${value.slice(-2)}`;
}

export async function seedIremboPay(dataSource: DataSource): Promise<void> {
  const log = (msg: string): void => {
    // eslint-disable-next-line no-console
    console.log(`[Seed] IremboPay — ${msg}`);
  };

  const secretKey = (process.env.IREMBOPAY_SECRET_KEY ?? '').trim();
  const publicKey = (process.env.IREMBOPAY_PUBLIC_KEY ?? '').trim();

  const [method] = await dataSource.query(
    `SELECT id FROM payment_methods WHERE code = 'IREMBOPAY' LIMIT 1`,
  );
  if (!method) {
    log('no IREMBOPAY payment method row — run the migrations first.');
    return;
  }

  const [existing] = await dataSource.query(
    `SELECT settings FROM payment_method_settings WHERE payment_method_id = $1 LIMIT 1`,
    [method.id],
  );
  const current: Record<string, string> = existing?.settings ?? {};

  if (!secretKey && !current.secretKey) {
    log(
      'no credentials. Add IREMBOPAY_SECRET_KEY and IREMBOPAY_PUBLIC_KEY to your ' +
        'gitignored .env (portal → Integrations Details → View Token), then re-run ' +
        'this seed — or enter them in Admin → Settings → Payments.',
    );
    return;
  }

  // Never downgrade a configured gateway: an environment already holding
  // production keys keeps them.
  const settings: Record<string, string> = {
    ...SANDBOX,
    ...current,
    ...(secretKey && !current.secretKey ? { secretKey } : {}),
    ...(publicKey && !current.publicKey ? { publicKey } : {}),
  };
  delete settings.productCode; // mapped per payment type below, not a method setting

  if (existing) {
    await dataSource.query(
      `UPDATE payment_method_settings
         SET settings = $1, is_test_mode = COALESCE(is_test_mode, true), updated_at = now()
       WHERE payment_method_id = $2`,
      [JSON.stringify(settings), method.id],
    );
  } else {
    await dataSource.query(
      `INSERT INTO payment_method_settings (payment_method_id, settings, is_test_mode)
       VALUES ($1, $2, true)`,
      [method.id, JSON.stringify(settings)],
    );
  }

  // Every payment type needs a product or it fails the moment a payer tries to
  // pay it. Only unmapped types are touched.
  const productCode = process.env.IREMBOPAY_PRODUCT_CODE || SANDBOX.productCode;
  const { rowCount } = await dataSource
    .query(
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
    )
    .then((rows: unknown[]) => ({ rowCount: rows.length }));

  log(
    `configured — account=${settings.paymentAccountIdentifier}, ` +
      `secret=${fingerprint(settings.secretKey ?? '')}, sandbox mode, ` +
      `${rowCount} payment type(s) mapped to ${productCode}`,
  );
}
