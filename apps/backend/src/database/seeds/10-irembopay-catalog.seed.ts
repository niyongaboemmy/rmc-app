import { DataSource } from 'typeorm';

/**
 * IremboPay product catalog: which product code each payment type is charged
 * under, per merchant (sandbox / production) and per currency.
 *
 * Product codes and payment account identifiers are identifiers, not
 * credentials — useless without the secret key — so the production catalog
 * lives here, in tracked source, as the sandbox code always has. The keys never
 * do; see `09-irembopay.seed.ts`.
 *
 * Source: the IremboPay production sheet for merchant "RWANDA MUSLIM
 * COMMUNITY" (October 2026). Every product is a variable-amount Service
 * (amount 0), so the invoice always carries our own `unitAmount`.
 */

export type CatalogCurrency = 'RWF' | 'USD' | 'EUR';

export interface CatalogEntry {
  paymentTypeKey: string;
  currency: CatalogCurrency;
  productCode: string;
  /** The product's name on the IremboPay portal, for the cross-check. */
  label: string;
}

/** One payment account per currency; the account fixes an invoice's currency. */
export const PRODUCTION_ACCOUNTS: Record<CatalogCurrency, string> = {
  RWF: 'RMC_RWF',
  USD: 'RMC_USD',
  EUR: 'RMC_EUR',
};

export const PRODUCTION_CATALOG: readonly CatalogEntry[] = [
  {
    paymentTypeKey: 'QURAN_SUPPORT',
    currency: 'EUR',
    productCode: 'PC-27abc328ba',
    label: "Qur'an Support_EUR",
  },
  {
    paymentTypeKey: 'QURAN_SUPPORT',
    currency: 'USD',
    productCode: 'PC-9b325a4b01',
    label: "Qur'an Support_USD",
  },
  {
    paymentTypeKey: 'QURAN_SUPPORT',
    currency: 'RWF',
    productCode: 'PC-f244091217',
    label: "Qur'an Support_RWF",
  },
  {
    paymentTypeKey: 'HAJJ_FEE',
    currency: 'USD',
    productCode: 'PC-1426e258b6',
    label: 'Hajj Service_USD',
  },
  {
    paymentTypeKey: 'HAJJ_FEE',
    currency: 'RWF',
    productCode: 'PC-c923354298',
    label: 'Hajj Service_RWF',
  },
  {
    paymentTypeKey: 'GOOD_CONDUCT_FEE',
    currency: 'RWF',
    productCode: 'PC-4ceb24218e',
    label: 'Good Conduct Certificate_RWF',
  },
  {
    paymentTypeKey: 'MARRIAGE_FEE',
    currency: 'RWF',
    productCode: 'PC-4244ac51ef',
    label: 'Marriage Service_RWF',
  },
  {
    paymentTypeKey: 'DONATION',
    currency: 'EUR',
    productCode: 'PC-b38b93d13f',
    label: 'Sadaqat_EUR',
  },
  {
    paymentTypeKey: 'DONATION',
    currency: 'USD',
    productCode: 'PC-f908aacaa7',
    label: 'Sadaqat_USD',
  },
  {
    paymentTypeKey: 'DONATION',
    currency: 'RWF',
    productCode: 'PC-47fbbd81b8',
    label: 'Sadaqat_RWF',
  },
  {
    paymentTypeKey: 'ZAKAT_FITR',
    currency: 'RWF',
    productCode: 'PC-9dd37e152d',
    label: 'Zakatul fitri_RWF',
  },
  {
    paymentTypeKey: 'ZAKAT',
    currency: 'EUR',
    productCode: 'PC-67b0929312',
    label: 'Zakatul maal_EUR',
  },
  {
    paymentTypeKey: 'ZAKAT',
    currency: 'USD',
    productCode: 'PC-5ab548a68d',
    label: 'Zakatul maal_USD',
  },
  {
    paymentTypeKey: 'ZAKAT',
    currency: 'RWF',
    productCode: 'PC-5d0f480b7e',
    label: 'Zakatul maal_RWF',
  },
];

/** The sandbox merchant had one catch-all product, in RWF only. */
export const SANDBOX_CATALOG = {
  productCode: 'PC-62d7108dd9',
  currency: 'RWF' as CatalogCurrency,
  account: 'RMC-RWF',
};

/**
 * `PC-` and 10 lowercase hex digits. The codes were transcribed from a
 * screenshot, where `1`/`l` and `0`/`O` look alike; neither `l` nor `O` is hex,
 * so a misread is caught here instead of as PRODUCT_NOT_FOUND on a live payer.
 */
export const PRODUCT_CODE_RE = /^PC-[0-9a-f]{10}$/;

/** Throws on the first malformed or duplicated entry; nothing is written then. */
export function validateCatalog(catalog: readonly CatalogEntry[]): void {
  const seen = new Set<string>();
  for (const entry of catalog) {
    if (!PRODUCT_CODE_RE.test(entry.productCode)) {
      throw new Error(`malformed product code "${entry.productCode}" (${entry.label})`);
    }
    const scope = `${entry.paymentTypeKey}/${entry.currency}`;
    if (seen.has(scope)) throw new Error(`two products for ${scope}`);
    seen.add(scope);
  }
}

/**
 * Each production mapping also names its payment account (RMC_RWF/USD/EUR).
 * The provider prefers a mapping's account over the method-level one, so the
 * production accounts travel with the production products: going live is then
 * just the production keys plus the Test-mode toggle, with no account fields
 * to remember to change by hand — the sandbox account `RMC-RWF` on the
 * settings row is never used for a production charge.
 */
const UPSERT_PRODUCTION = `
  INSERT INTO payment_type_provider_products
    (provider, environment, payment_type_id, payment_type_rate_id, currency, product_code,
     payment_account_identifier)
  SELECT 'irembopay', 'production', pt.id, NULL, $2, $3, $4
    FROM payment_types pt
   WHERE pt.key = $1
  ON CONFLICT (provider, environment, payment_type_id,
               COALESCE(payment_type_rate_id, '00000000-0000-0000-0000-000000000000'::uuid),
               currency)
  DO UPDATE SET product_code = EXCLUDED.product_code,
                payment_account_identifier = EXCLUDED.payment_account_identifier,
                updated_at = now()
   WHERE payment_type_provider_products.product_code IS DISTINCT FROM EXCLUDED.product_code
      OR payment_type_provider_products.payment_account_identifier
           IS DISTINCT FROM EXCLUDED.payment_account_identifier
  RETURNING (xmax = 0) AS inserted`;

/**
 * Brings the IremboPay product mappings in line with the catalog.
 *
 * - Production rows are written from `PRODUCTION_CATALOG` regardless of the
 *   current mode, so the catalog is in place before the production keys are.
 *   It is inert until Test mode goes off: the live path only reads mappings of
 *   the gateway's current environment. The sheet is the source of truth for
 *   production, so a changed code is overwritten, and logged as such.
 * - Sandbox rows are never modified. A type with no sandbox mapping gets the
 *   catch-all sandbox product, so local and staging environments still charge.
 * - Production rows absent from the catalog are kept (an admin may have added
 *   them in the Products tab), unless IREMBOPAY_PRUNE=1.
 *
 * Idempotent; safe to re-run from the seed workflow.
 */
export async function seedIremboPayCatalog(dataSource: DataSource): Promise<void> {
  const log = (msg: string): void => {
    // eslint-disable-next-line no-console
    console.log(`[Seed] IremboPay catalog — ${msg}`);
  };

  validateCatalog(PRODUCTION_CATALOG);

  const [hasColumns] = await dataSource.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'payment_type_provider_products'
        AND column_name IN ('currency', 'environment')`,
  );
  if (hasColumns.n < 2) {
    log('product mappings have no currency/environment yet — run the migrations first.');
    return;
  }

  const keys: { key: string }[] = await dataSource.query(`SELECT key FROM payment_types`);
  const known = new Set(keys.map((k) => k.key));
  const missing = [...new Set(PRODUCTION_CATALOG.map((e) => e.paymentTypeKey))].filter(
    (k) => !known.has(k),
  );
  if (missing.length > 0) {
    // A partial catalog would leave some services unpayable on production
    // without saying so; refuse the lot instead.
    throw new Error(
      `payment type(s) ${missing.join(', ')} do not exist — run the migrations first.`,
    );
  }

  let inserted = 0;
  let updated = 0;
  await dataSource.transaction(async (manager) => {
    for (const entry of PRODUCTION_CATALOG) {
      const [previous] = await manager.query(
        `SELECT p.product_code, p.payment_account_identifier FROM payment_type_provider_products p
           JOIN payment_types pt ON pt.id = p.payment_type_id
          WHERE p.provider = 'irembopay' AND p.environment = 'production'
            AND pt.key = $1 AND p.currency = $2 AND p.payment_type_rate_id IS NULL`,
        [entry.paymentTypeKey, entry.currency],
      );
      const rows: { inserted: boolean }[] = await manager.query(UPSERT_PRODUCTION, [
        entry.paymentTypeKey,
        entry.currency,
        entry.productCode,
        PRODUCTION_ACCOUNTS[entry.currency],
      ]);
      if (rows.length === 0) continue;
      if (rows[0].inserted) {
        inserted++;
      } else {
        updated++;
        log(
          `${entry.paymentTypeKey}/${entry.currency}: ` +
            `${previous?.product_code}@${previous?.payment_account_identifier ?? '-'} → ` +
            `${entry.productCode}@${PRODUCTION_ACCOUNTS[entry.currency]}`,
        );
      }
    }

    if (process.env.IREMBOPAY_PRUNE === '1') {
      const scopes = PRODUCTION_CATALOG.map((e) => `${e.paymentTypeKey}/${e.currency}`);
      const result: unknown = await manager.query(
        `DELETE FROM payment_type_provider_products p
          USING payment_types pt
          WHERE pt.id = p.payment_type_id
            AND p.provider = 'irembopay' AND p.environment = 'production'
            AND (p.payment_type_rate_id IS NOT NULL
                 OR NOT (pt.key || '/' || trim(p.currency)) = ANY($1::text[]))
         RETURNING p.id`,
        [scopes],
      );
      // TypeORM answers a DELETE … RETURNING with [rows, affectedCount].
      const pruned = Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
      if (pruned > 0) log(`pruned ${pruned} production mapping(s) not in the catalog`);
    }
  });

  // A sandbox merchant other than RMC's (a developer's own) has its own code.
  const sandboxCode = /^P[CI]-[0-9a-z]+$/i.test((process.env.IREMBOPAY_PRODUCT_CODE ?? '').trim())
    ? (process.env.IREMBOPAY_PRODUCT_CODE as string).trim()
    : SANDBOX_CATALOG.productCode;
  const sandboxFilled: unknown[] = await dataSource.query(
    `INSERT INTO payment_type_provider_products
       (provider, environment, payment_type_id, payment_type_rate_id, currency, product_code)
     SELECT 'irembopay', 'sandbox', pt.id, NULL, $2, $1
       FROM payment_types pt
      WHERE NOT EXISTS (
        SELECT 1 FROM payment_type_provider_products p
         WHERE p.provider = 'irembopay' AND p.environment = 'sandbox'
           AND p.payment_type_id = pt.id AND p.payment_type_rate_id IS NULL
           AND p.currency = $2)
     RETURNING id`,
    [sandboxCode, SANDBOX_CATALOG.currency],
  );

  log(
    `production: ${inserted} added, ${updated} changed, ` +
      `${PRODUCTION_CATALOG.length - inserted - updated} already current; ` +
      `sandbox: ${sandboxFilled.length} type(s) given ${sandboxCode}`,
  );
  await logCoverage(dataSource, log);
}

/**
 * The type × currency matrix for production — what runbook step 6 compares
 * against the portal — plus a warning for every active type that would fail an
 * RWF charge.
 */
async function logCoverage(dataSource: DataSource, log: (msg: string) => void): Promise<void> {
  const rows: { key: string; is_active: boolean; rwf: string; usd: string; eur: string }[] =
    await dataSource.query(
      `SELECT pt.key, pt.is_active,
              max(p.product_code) FILTER (WHERE p.currency = 'RWF') AS rwf,
              max(p.product_code) FILTER (WHERE p.currency = 'USD') AS usd,
              max(p.product_code) FILTER (WHERE p.currency = 'EUR') AS eur
         FROM payment_types pt
         LEFT JOIN payment_type_provider_products p
           ON p.payment_type_id = pt.id AND p.provider = 'irembopay'
          AND p.environment = 'production' AND p.payment_type_rate_id IS NULL
        GROUP BY pt.key, pt.is_active
        ORDER BY pt.key`,
    );

  log('production coverage (type: RWF | USD | EUR):');
  for (const r of rows) {
    const cell = (v: string | null) => (v ?? '—').padEnd(13);
    log(
      `  ${r.key.padEnd(17)} ${cell(r.rwf)} ${cell(r.usd)} ${cell(r.eur)}${r.is_active ? '' : ' (inactive)'}`,
    );
  }

  const unpayable = rows.filter((r) => r.is_active && !r.rwf).map((r) => r.key);
  if (unpayable.length > 0) {
    log(
      `WARNING: active type(s) with no production RWF product: ${unpayable.join(', ')}. ` +
        'They will refuse RWF charges in production mode.',
    );
  }
}
