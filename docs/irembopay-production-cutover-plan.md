# IremboPay — Production Cutover Plan

**Status:** Phases 1–5 **implemented and tested** (2026-10-14). Phase 6 (the
runbook) waits for the production API keys. See [Implementation notes](#implementation-notes)
for where the build differs from the first draft of this plan.
**Date:** 2026-10-14
**Branch:** `fix/irembopay-production-seed` (continue here, or branch `feat/irembopay-production`)
**Sandbox archive:** [irembopay-sandbox-reference.md](irembopay-sandbox-reference.md)
**Earlier plans:** [irembopay-integration-plan.md](irembopay-integration-plan.md), [irembopay-phased-implementation-plan.md](irembopay-phased-implementation-plan.md)

---

## 0. Summary

IremboPay has moved RMC to production. Production is not "the sandbox with
different keys". It differs in four ways that the current code does not handle:

| # | Production fact | Current code | Effect if we only swap keys |
|---|---|---|---|
| 1 | **Three payment accounts**, one per currency: `RMC_RWF`, `RMC_USD`, `RMC_EUR` | Settings hold an RWF account and an optional USD account. `accountForCurrency()` **falls back to the RWF account** for any other currency. | **A €50 donation is invoiced as 50 RWF.** IremboPay returns no error, because the account sets the currency. |
| 2 | **14 products, one per (service × currency)** | One product per payment type, with no currency dimension. The sandbox seed mapped `PC-62d7108dd9` to all 11 types. | A USD invoice would carry an RWF product code. Cross-currency products are rejected or mis-reported. |
| 3 | **Donations split by intention**: Sadaqat, Zakatul maal, Zakatul fitr, Qur'an Support | Every donation is charged as `DONATION`. | All donations land on one product, and the finance team loses the split they asked IremboPay for. |
| 4 | **Separate merchant.** Sandbox invoices do not exist on production. | Reconciliation polls every open invoice, sandbox ones included. | After cutover, sandbox invoices are polled against `api.irembopay.com` and 404 every cycle. |

Sandbox identifiers also differ in form: the sandbox account is `RMC-RWF`
(hyphen) and production is `RMC_RWF` (underscore). This is easy to get wrong
when typing it by hand.

The cutover therefore has six phases. Phases 1–5 are code and can merge before
the keys arrive. Phase 6 is the operational runbook.

```
P1 Preserve sandbox ─► P2 Schema ─► P3 Config/resolution ─► P4 Donation routing ─► P5 Seed + admin UI ─► P6 Cutover runbook
   (docs + script)     (migration)   (accounts per ccy,     (niyyah → product,    (production catalog,   (keys, smoke, go-live,
                                      env-scoped products)   currency guards)      EUR field, Products)    rollback)
```

---

## Implementation notes

What was built, and where it deliberately differs from the first draft below:

| Area | As built |
|---|---|
| Migration | `1790000000085-081-irembopay-production-catalog.ts`. It also adds **`irembopay_invoices.environment`** (existing rows → `sandbox`). `is_test` could not separate the merchants, because admin test-panel invoices on production are `is_test = true` too. Reconciliation filters on `environment`. |
| Catalog seed | `10-irembopay-catalog.seed.ts` exports `PRODUCTION_CATALOG`, `PRODUCTION_ACCOUNTS`, `SANDBOX_CATALOG` and validates every code (`/^PC-[0-9a-f]{10}$/`, one product per type × currency) before writing anything. |
| Key replacement (09 seed) | Env keys replace the row's keys under **any explicit** `IREMBOPAY_MODE`, not only `production`, so the sandbox rollback works the same way. Provenance is stored as `settings.credentialsFor`. The admin UI clears it when the secret is changed by hand. |
| Go-live guard (09 seed) | `IREMBOPAY_MODE=production` **refuses and changes nothing** unless production keys are supplied in `.env` or were recorded by an earlier production run. This prevents live mode with sandbox keys (the `b1d3aee` failure). |
| Accounts (09 seed) | `IREMBOPAY_ACCOUNT_{RWF,USD,EUR}`. Production fills missing ones with `RMC_*` and replaces a leftover `RMC-RWF`. Sandbox mode turns `RMC_RWF` back into `RMC-RWF` and drops USD/EUR. |
| Donor errors | A gateway refusal (no product or account for the currency) is now a **400 `PAYMENT_NOT_AVAILABLE`** and the gifts are marked `FAILED/REFUSED`, instead of a 503 "try again later". |
| Webhook drift | Logged at **error** level by `IremboPayInvoiceService` for both webhook and reconciliation. No `payment_provider_events` row: that service lives in a module the invoice service cannot import without a cycle. |
| Frontend | `acceptedMethodsFor(currency)` lists cards only for USD/EUR. The `zakat-al-fitr` niyyah is shown in RWF only, and the cart drops it on a currency switch. The Products tab has Merchant and Currency switches. The Testing tab has a currency selector and disables push for USD/EUR. There is no frontend CSP, so the widget host needed no change. |
| Snapshot | `scripts/irembopay-snapshot.ts` writes `apps/backend/backups/` (gitignored, mode 0600). |

### Verification performed

- **Unit:** backend 737/737, frontend 411/411. New coverage includes strict per-currency accounts, environment- and currency-scoped resolution, catalog transcription checks, donation intention routing, currency guards, the reconciliation environment filter, drift logging, and admin endpoints.
- **Migration:** applied on a clone of the dev DB together with every pending migration (070–085), reverted, and re-applied. Sandbox rows were preserved and the unique index rejects duplicate scopes.
- **Seed scenarios** on the clone: fresh sandbox run, idempotent re-run, production refused without keys (and with a secret key only), cutover with keys (accounts → `RMC_*`, test mode off), re-runs, stale env keys ignored, a tampered code corrected, prune, rollback to sandbox, and back to production.
- **End to end, 36/36 checks:** the real NestJS app on the clone in production mode against a local mock of IremboPay that enforces the documented rules (account → currency, unknown product → `PRODUCT_NOT_FOUND`, non-RWF push → `BAD_DATA`). Covered: RWF MoMo, a USD 3-line basket (Sadaqat, Zakat and Qur'an codes), EUR Zakat, Zakat al-Fitr RWF/USD, every guard, a signed webhook settling all three USD gifts and the USD ledger row, a sandbox-signed forgery rejected, drift settled and logged, admin status/products/test invoices for marriage, good conduct, Hajj USD and Qur'an EUR.
- **Reconciliation query** run against the DB: production returned 8 invoices and sandbox 23, matching ground truth.

---

## 1. Production facts (verified against the v3 docs)

Source: `https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/`.
`https://docs.irembopay.com/` currently serves a self-signed certificate and a
gateway 404, so I read the GitBook mirror it fronts. Re-check it once it is fixed.

| Item | Sandbox | **Production** |
|---|---|---|
| API host (stored as `apiBaseUrl`) | `https://api.sandbox.irembopay.com` | **`https://api.irembopay.com`** |
| Create invoice | `POST {host}/payments/invoices` | same path |
| Get invoice | `GET {host}/payments/invoices/{invoiceNumber}` | same path |
| MoMo push | `POST {host}/payments/transactions/initiate` | same path |
| Widget JS | `https://dashboard.sandbox.irembopay.com/assets/payment/inline.js` | **`https://dashboard.irembopay.com/assets/payment/inline.js`** |
| Portal | `dashboard.sandbox.irembopay.com` | `dashboard.irembopay.com`. Keys are under **Integration Details → View Token** (Admin merchant only). |
| Headers | `irembopay-secretKey`, `X-API-Version: 3`, `Content-Type: application/json` | unchanged |
| Webhook header | `irembopay-signature: t=<ms>,s=<hex>` | unchanged |
| Signature | `HMAC_SHA256(secretKey, "${t}#${rawBody}")`, hex, timing-safe compare, 300 s tolerance | unchanged. **Production secret, so every sandbox webhook fails verification after the swap.** |

The production values are already the defaults in
[irembo-pay.config.service.ts:39-42](../apps/backend/src/integrations/irembo-pay/irembo-pay.config.service.ts#L39-L42).
With `isTestMode = false` and the `apiBaseUrl`/`widgetScriptUrl` overrides left
blank, the client already targets production. **No URL changes are needed in
code.**

API rules that drive this plan:

- **`paymentAccountIdentifier` determines the invoice currency** (Create Invoice, field table). Invoice `currency ∈ {RWF, EUR, GBP, USD}`.
- **One invoice has exactly one account**, so one currency. A cart cannot mix currencies.
- **`paymentItems[].unitAmount` is mandatory.** Every production product is defined with amount `0` (variable amount), so we always send our own amount. This is the current behaviour.
- **MoMo push is RWF-only.** `BAD_DATA: Currency of the invoice is not RWF`. USD and EUR are paid by card (or bank) through the widget or the `paymentLinkUrl`.
- MoMo `accountIdentifier` uses the format `07XXXXXXXX`. The `BAD_PHONE_NUMBER` text mentions 12 digits; the existing normaliser already handles this.
- Error codes we must surface clearly: `PAYMENT_ACCOUNT_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `AUTHENTICATION_FAILED` (401), `INVALID_KEY` (widget public key).

---

## 2. Production catalog (from the IremboPay sheet)

Merchant: **RWANDA MUSLIM COMMUNITY**. All products are type *Service* with
amount 0 (variable).

| Product (IremboPay) | Code | Ccy | Our payment type | Status of type today |
|---|---|---|---|---|
| Qur'an Support_EUR | `PC-27abc328ba` | EUR | `QURAN_SUPPORT` (**new**) | — |
| Qur'an Support_USD | `PC-9b325a4b01` | USD | `QURAN_SUPPORT` | — |
| Qur'an Support_RWF | `PC-f244091217` | RWF | `QURAN_SUPPORT` | — |
| Hajj Service_USD | `PC-1426e258b6` | USD | `HAJJ_FEE` | inactive |
| Hajj Service_RWF | `PC-c923354298` | RWF | `HAJJ_FEE` | inactive |
| Good Conduct Certificate_RWF | `PC-4ceb24218e` | RWF | `GOOD_CONDUCT_FEE` | active (rate `STANDARD`, 2 000 RWF) |
| Marriage Service_RWF | `PC-4244ac51ef` | RWF | `MARRIAGE_FEE` | active (rates `MOSQUE`, `OUTSIDE_MOSQUE`) |
| Sadaqat_EUR | `PC-b38b93d13f` | EUR | `DONATION` | active |
| Sadaqat_USD | `PC-f908aacaa7` | USD | `DONATION` | active |
| Sadaqat_RWF | `PC-47fbbd81b8` | RWF | `DONATION` | active |
| Zakatul fitri_RWF | `PC-9dd37e152d` | RWF | `ZAKAT_FITR` (**new**) | — |
| Zakatul maal_EUR | `PC-67b0929312` | EUR | `ZAKAT` | inactive → **activate** |
| Zakatul maal_USD | `PC-5ab548a68d` | USD | `ZAKAT` | inactive → **activate** |
| Zakatul maal_RWF | `PC-5d0f480b7e` | RWF | `ZAKAT` | inactive → **activate** |

Payment accounts (identifier → settlement account, *RMC CENTRAL ACCOUNT* at Bank of Kigali Plc):

| Identifier (API) | Currency | BK account number | Max per transaction | Max per day |
|---|---|---|---|---|
| `RMC_RWF` | RWF | 100014931117 | 50,000,000 | 100,000,000 |
| `RMC_USD` | USD | 100014931273 | 100,000 | 300,000 |
| `RMC_EUR` | EUR | 100014931389 | 100,000 | 300,000 |

The bank numbers are for finance reconciliation only; the API uses the
identifiers. The catalog seed stores each production product **with its
account**, so a production charge never reads the method-level account. The
limits are enforced before invoicing (`IremboPayProvider.assertWithinLimits`):
over the per-transaction limit, or over the day's settled total in Kigali time,
the payer gets a 400 with a plain message. The defaults above are editable in
Admin → Settings → Payments → IremboPay (`maxTransaction*` / `maxDaily*`).

Merchant portal users (`dashboard.irembopay.com`) are invited by IremboPay
directly and have portal roles only — Merchant admin (Mufti of Rwanda),
Merchant Operations admin (IT & Communication), Merchant Operations, and
Merchant Finance Operations. Nothing in RMC's app corresponds to them. Only
the **Merchant admin** can open *Integration Details → View Token* for the keys.

**Payment types with no production product:** `MEMBERSHIP_FEE`, `SCHOOL_FEE`,
`EVENT_FEE`, `FUNERAL_FEE`, `TENDER_FEE`, `SCHOLARSHIP_FEE`. All are inactive
today. In production they stay **unmapped on purpose**, so a charge fails with
the "map it in the Products tab" error. They must not inherit a catch-all code
the way they did in the sandbox.

> **Transcription check.** Codes are `PC-` followed by 10 lowercase hex digits.
> They were transcribed from a screenshot, where `1`/`l` and `0`/`O` are
> ambiguous. The seed validates `/^PC-[0-9a-f]{10}$/`, and the runbook
> cross-checks each code against the portal's **Products** page before go-live
> (Phase 6, step 6).

Product codes and account identifiers are **identifiers, not credentials**.
They are useless without the secret key, so they may live in a tracked seed
file, just as the sandbox `PC-62d7108dd9` already does. Keys never do.

---

## Phase 1 — Preserve the sandbox

**Goal:** after cutover, sandbox can be restored in minutes, and nothing about it
exists only in someone's memory.

| Task | Detail |
|---|---|
| 1.1 Sandbox reference doc | **Done:** [docs/irembopay-sandbox-reference.md](irembopay-sandbox-reference.md) (hosts, `RMC-RWF`, `PC-62d7108dd9`, test MSISDNs and cards, restore steps). |
| 1.2 Password manager | Create the entry **"IremboPay — SANDBOX"** with the secret key, public key and portal login. Create **"IremboPay — PRODUCTION"** for the incoming keys. Owner: the Admin merchant. |
| 1.3 Settings snapshot script | `apps/backend/scripts/irembopay-snapshot.ts`. It reads `payment_method_settings` and `payment_type_provider_products` for IremboPay and writes them to `apps/backend/backups/irembopay-<env>-<yyyymmdd-hhmm>.json` with mode `0600`. Add `apps/backend/backups/` to `.gitignore`. Print key fingerprints only (`sk_live…a3`), never full keys, to stdout. |
| 1.4 Environment-scoped mappings | Phase 2 adds `environment` to the product mappings. Existing rows become `sandbox` and **stay in the table**. Production rows are added next to them. Turning Test mode on selects the sandbox set again. This is the durable "backup" inside the project. |

Run 1.3 against production **before** Phase 6 (runbook step 1). Copy the JSON
into the password manager entry, then delete the local file.

---

## Phase 2 — Schema (migration `1790000000085-081-irembopay-production-catalog.ts`)

### 2.1 `payment_type_provider_products`: add currency and environment

```sql
ALTER TABLE payment_type_provider_products
  ADD COLUMN currency    char(3)     NOT NULL DEFAULT 'RWF',
  ADD COLUMN environment varchar(10) NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production'));

-- Existing rows were created by the sandbox seed or the sandbox admin UI.
-- The default above labels them 'sandbox'; nothing else changes.

-- One mapping per (provider, env, type, rate-or-default, currency).
-- COALESCE so the type-default row (rate NULL) is unique too.
CREATE UNIQUE INDEX "UQ_ptpp_scope"
  ON payment_type_provider_products
     (provider, environment, payment_type_id,
      COALESCE(payment_type_rate_id, '00000000-0000-0000-0000-000000000000'::uuid),
      currency);
```

Before creating the new index, drop the existing one, which would otherwise block
a second currency per type:

```sql
DROP INDEX "UQ_ptpp_provider_type_rate";  -- (provider, payment_type_id, COALESCE(rate_id, nil-uuid))
```

`down()` recreates it after deleting the production rows.

`down()` deletes the `environment = 'production'` rows, then drops the index
and both columns.

### 2.2 New payment types

`PaymentTypeKey` enum in
[payment-type.entity.ts](../apps/backend/src/payment-settings/entities/payment-type.entity.ts#L12):

```ts
QURAN_SUPPORT = 'QURAN_SUPPORT',
ZAKAT_FITR = 'ZAKAT_FITR',
```

The same migration runs:

```sql
INSERT INTO payment_types (key, name, description, is_active)
VALUES ('QURAN_SUPPORT', 'Qur''an Support', 'Donations to Qur''an programmes', true),
       ('ZAKAT_FITR',    'Zakat al-Fitr',   'Zakat al-Fitr (Ramadan)',          true)
ON CONFLICT (key) DO NOTHING;

-- Zakat al-Mal now has a live product.
UPDATE payment_types SET is_active = true, name = 'Zakat al-Mal' WHERE key = 'ZAKAT';
```

`HAJJ_FEE` stays inactive. It gets a mapping but is not activated until the
Hajj flow exists.

### 2.3 Entity

Add to
[payment-type-provider-product.entity.ts](../apps/backend/src/payment-settings/entities/payment-type-provider-product.entity.ts):

```ts
/** ISO 4217. Must match the currency of the payment account the invoice uses. */
@Column({ type: 'char', length: 3, default: 'RWF' })
currency: string;

/** Which merchant the code exists on. Selected by the gateway's Test-mode flag. */
@Column({ type: 'varchar', length: 10, default: 'sandbox' })
environment: 'sandbox' | 'production';
```

Keep `paymentAccountIdentifier` as a per-row override, but Phase 3 validates it.

---

## Phase 3 — Configuration and product resolution (backend)

### 3.1 One account per currency
[irembo-pay.config.service.ts](../apps/backend/src/integrations/irembo-pay/irembo-pay.config.service.ts)

- Add `paymentAccountIdentifierEur` next to `paymentAccountIdentifierUsd`. `paymentAccountIdentifier` stays the RWF account, so the existing UI and data keep working.
- Add `environment: 'sandbox' | 'production'` to `IremboPayConfig`, derived as `isTestMode ? 'sandbox' : 'production'`.
- **Rewrite `accountForCurrency()` so it never falls back across currencies:**

```ts
/** The payment account for a currency. Never falls back to another currency's account. */
async accountForCurrency(currency: string): Promise<string> {
  const c = await this.get();
  const ccy = currency.toUpperCase();
  const account = {
    RWF: c.paymentAccountIdentifier,
    USD: c.paymentAccountIdentifierUsd,
    EUR: c.paymentAccountIdentifierEur,
  }[ccy];
  if (!account) {
    throw new BadRequestException(
      `IremboPay has no ${ccy} payment account configured. ` +
        `Set it in Admin → Settings → Payments → IremboPay.`,
    );
  }
  return account;
}
```

- `isConfigured()` still requires only the RWF account. USD and EUR are optional, and a missing one fails only charges in that currency.

### 3.2 Currency- and environment-aware product resolution
[provider-products.service.ts](../apps/backend/src/payment-settings/provider-products.service.ts)

New signature:

```ts
resolveForCharge(
  provider: string,
  paymentTypeKey: string,
  opts: { rateId?: string; currency: string; environment: 'sandbox' | 'production' },
): Promise<ResolvedProduct>
```

Resolution order, with all candidates filtered by `provider`, `environment` and
`currency`:

1. rate-specific row
2. type-default row (`payment_type_rate_id IS NULL`)
3. otherwise throw `BadRequestException`: *"No IremboPay product for Zakat al-Mal (ZAKAT) in EUR on production. Map it in Admin → Settings → Payments → Products."*

**No fallback across currencies and none across environments.** A sandbox code
on production is the exact bug from commit `b1d3aee`.

`listRows()` and `upsert()` also take `environment` and `currency`. `upsert`'s
lookup key becomes `(provider, environment, typeId, rateId, currency)`.

### 3.3 Provider
[irembo-pay.provider.ts:52-90](../apps/backend/src/payments/providers/irembo-pay.provider.ts#L52-L90)

```ts
const currency = (req.currency ?? 'RWF').toUpperCase();
const env = cfg.isTestMode ? 'sandbox' : 'production';

const resolved = await Promise.all(lines.map(async (line) => ({
  line,
  product: await this.products.resolveForCharge(IREMBOPAY_PROVIDER_KEY, line.paymentTypeKey, {
    rateId: line.paymentTypeRateId, currency, environment: env,
  }),
})));

const paymentAccount =
  resolved.find((r) => r.product.paymentAccountIdentifier)?.product.paymentAccountIdentifier ||
  (await this.config.accountForCurrency(currency));

// MoMo push is RWF-only on IremboPay (BAD_DATA otherwise). Refuse it before
// creating an invoice the payer could never settle by push.
if (req.pushProvider && currency !== 'RWF') {
  throw new BadRequestException('Mobile money is available for RWF payments only. Pay by card.');
}
```

Delete the comment that says the first line's account override wins over the
others. With currency on every mapping, all lines resolve within one currency
by construction.

### 3.4 Reconciliation and webhook must stay within one environment

- [irembopay-invoice.service.ts:56](../apps/backend/src/integrations/irembo-pay/irembopay-invoice.service.ts#L56): `findOpenForReconciliation` takes the environment and filters on the new `irembopay_invoices.environment` column. It does not filter on `is_test`, which is also true for admin test invoices on production. The reconciliation service passes `cfg.environment`. Sandbox invoices left `NEW` at cutover are then no longer polled against production. Separately, a one-off SQL in the runbook expires them (step 9).
- [irembo-pay-webhook.service.ts](../apps/backend/src/webhooks/irembo-pay-webhook.service.ts): after the signature is verified, compare `data.currency` and `data.paymentAccountIdentifier` with the stored invoice. On a mismatch, log `WARN` and record a `payment_provider_events` row, but **still settle**. The money is real, and the alert is for finance. This catches a wrong account configured in production.

---

## Phase 4 — Donation routing (intention → product, currency guards)

### 4.1 Map each donation to a payment type

New pure module `apps/backend/src/donations/donation-payment-type.ts`:

```ts
import { DonationMeta } from './donation-meta';

/**
 * Which IremboPay product a donation is collected under. The payment type key is
 * what ProviderProductsService resolves to a product code (per currency, per env).
 *
 *   niyyah zakat          → ZAKAT          (Zakatul maal, RWF/USD/EUR)
 *   niyyah zakat-al-fitr  → ZAKAT_FITR     (RWF only)
 *   category/fund quran   → QURAN_SUPPORT  (RWF/USD/EUR)
 *   everything else       → DONATION       (Sadaqat; lillah and sadaqah included)
 */
export function donationPaymentTypeKey(meta: DonationMeta): string {
  if (meta.niyyah === 'zakat-al-fitr') return 'ZAKAT_FITR';
  if (meta.niyyah === 'zakat' || meta.fund === 'zakat') return 'ZAKAT';
  if (meta.category === 'quran' || meta.fund === 'quran') return 'QURAN_SUPPORT';
  return 'DONATION';
}
```

The frontend `ZakatCalculator` already writes `fundKey: 'zakat'`, so Zakat al-Mal
needs no frontend change. Zakat al-Fitr and Qur'an Support need their keys
agreed (see Open questions Q1–Q2).

In [donations.service.ts](../apps/backend/src/donations/donations.service.ts):

- Single donation (≈line 334): `paymentTypeKey: donationPaymentTypeKey(parseDonationMeta(saved.message))`.
- Cart (≈lines 472, 481): set each `items[i].paymentTypeKey` from that line's meta. The top-level `paymentTypeKey` uses the first line, which is used only for logs. One invoice can then carry Sadaqat and Zakat lines together, because both use the same account and currency.
- Store `paymentTypeKey` on the `irembopay_invoices` row as today, and on `payment_transactions`, so finance reports split by product.

### 4.2 Currency guards (backend: never trust the client)

- `CreateDonationDto.currency` and the cart DTO: `@IsOptional() @IsIn(['RWF', 'USD', 'EUR'])`.
- Cart: refuse with 400 when `new Set(dtos.map(d => d.currency ?? 'RWF')).size > 1`. The frontend already clears the cart when the currency changes. This guard covers direct API calls.
- `ZAKAT_FITR` is RWF-only. Resolution throws a clear error for USD/EUR (no mapping). The UI should also offer it only in RWF.
- Momo with a non-RWF currency gets a 400 from Phase 3.3. The UI must hide MoMo when the currency is not RWF (4.3).

### 4.3 Frontend

| File | Change |
|---|---|
| [CartDrawer.tsx](../apps/frontend/src/components/donate/CartDrawer.tsx), [acceptedMethods.ts](../apps/frontend/src/components/payments/acceptedMethods.ts) | When `currency !== 'RWF'`, hide the MoMo option and default to card, with a hint: "Mobile money is available in RWF only". Add the strings to `en.json`, `rw.json`, and the other locales. |
| [donateData.ts](../apps/frontend/src/components/donate/donateData.ts) | Add the niyyah `zakat-al-fitr` (if Q1 is confirmed), shown only when currency is RWF. Add the Qur'an Support category/fund key (Q2). |
| [IremboPayWidget.tsx](../apps/frontend/src/components/payments/IremboPayWidget.tsx) | No change. It already loads `widgetScriptUrl` and `publicKey` from the charge response, and those follow the mode. Verify the CSP `script-src` allows `https://dashboard.irembopay.com` as well as the sandbox host (check `next.config` / middleware headers). |

---

## Phase 5 — Seed and admin UI

### 5.1 Production catalog seed
New `apps/backend/src/database/seeds/10-irembopay-catalog.seed.ts`, registered
in `run-seeds.ts` **after** `09-irembopay`.

```ts
/** Production merchant "RWANDA MUSLIM COMMUNITY". Identifiers, not secrets. */
export const PRODUCTION_ACCOUNTS = { RWF: 'RMC_RWF', USD: 'RMC_USD', EUR: 'RMC_EUR' } as const;

export const PRODUCTION_CATALOG: ReadonlyArray<{
  paymentTypeKey: string; currency: 'RWF' | 'USD' | 'EUR'; productCode: string; label: string;
}> = [
  { paymentTypeKey: 'QURAN_SUPPORT',    currency: 'EUR', productCode: 'PC-27abc328ba', label: "Qur'an Support_EUR" },
  { paymentTypeKey: 'QURAN_SUPPORT',    currency: 'USD', productCode: 'PC-9b325a4b01', label: "Qur'an Support_USD" },
  { paymentTypeKey: 'QURAN_SUPPORT',    currency: 'RWF', productCode: 'PC-f244091217', label: "Qur'an Support_RWF" },
  { paymentTypeKey: 'HAJJ_FEE',         currency: 'USD', productCode: 'PC-1426e258b6', label: 'Hajj Service_USD' },
  { paymentTypeKey: 'HAJJ_FEE',         currency: 'RWF', productCode: 'PC-c923354298', label: 'Hajj Service_RWF' },
  { paymentTypeKey: 'GOOD_CONDUCT_FEE', currency: 'RWF', productCode: 'PC-4ceb24218e', label: 'Good Conduct Certificate_RWF' },
  { paymentTypeKey: 'MARRIAGE_FEE',     currency: 'RWF', productCode: 'PC-4244ac51ef', label: 'Marriage Service_RWF' },
  { paymentTypeKey: 'DONATION',         currency: 'EUR', productCode: 'PC-b38b93d13f', label: 'Sadaqat_EUR' },
  { paymentTypeKey: 'DONATION',         currency: 'USD', productCode: 'PC-f908aacaa7', label: 'Sadaqat_USD' },
  { paymentTypeKey: 'DONATION',         currency: 'RWF', productCode: 'PC-47fbbd81b8', label: 'Sadaqat_RWF' },
  { paymentTypeKey: 'ZAKAT_FITR',       currency: 'RWF', productCode: 'PC-9dd37e152d', label: 'Zakatul fitri_RWF' },
  { paymentTypeKey: 'ZAKAT',            currency: 'EUR', productCode: 'PC-67b0929312', label: 'Zakatul maal_EUR' },
  { paymentTypeKey: 'ZAKAT',            currency: 'USD', productCode: 'PC-5ab548a68d', label: 'Zakatul maal_USD' },
  { paymentTypeKey: 'ZAKAT',            currency: 'RWF', productCode: 'PC-5d0f480b7e', label: 'Zakatul maal_RWF' },
];

export const SANDBOX_CATALOG = { productCode: 'PC-62d7108dd9', currency: 'RWF', account: 'RMC-RWF' } as const;
```

Behaviour (idempotent, safe to re-run from `seed-production.yml`):

1. Validate every code with `/^PC-[0-9a-f]{10}$/`. **Abort the whole seed** on a bad code; do not write a partial catalog.
2. **Always** upsert the production catalog as type-default rows (`payment_type_rate_id = NULL`, `environment = 'production'`). This runs whatever the current mode is, so the catalog is in place before the keys are. It does not affect the live path until Test mode is turned off.
   ```sql
   INSERT INTO payment_type_provider_products
     (provider, environment, payment_type_id, payment_type_rate_id, currency, product_code)
   SELECT 'irembopay', 'production', pt.id, NULL, $2, $3
     FROM payment_types pt WHERE pt.key = $1
   ON CONFLICT (provider, environment, payment_type_id,
                COALESCE(payment_type_rate_id, '00000000-0000-0000-0000-000000000000'::uuid), currency)
   DO UPDATE SET product_code = EXCLUDED.product_code, updated_at = now()
   WHERE payment_type_provider_products.product_code IS DISTINCT FROM EXCLUDED.product_code;
   ```
   The seed overwrites the code on conflict because the sheet is the source of truth for production. Log every change as `old → new`.
3. **Never** touch `environment = 'sandbox'` rows, except to insert the `SANDBOX_CATALOG` default for types that have none, which is the current 09 behaviour moved here.
4. Delete `environment = 'production'` rows whose `(type, currency)` is not in `PRODUCTION_CATALOG` **only** when `IREMBOPAY_PRUNE=1`. Admin-added mappings are kept by default.
5. Print a coverage matrix: `type × {RWF, USD, EUR}` → code or `—`. Warn for every **active** type with no production RWF mapping.

### 5.2 Changes to `09-irembopay.seed.ts`
[09-irembopay.seed.ts](../apps/backend/src/database/seeds/09-irembopay.seed.ts)

- Read `IREMBOPAY_ACCOUNT_RWF`, `IREMBOPAY_ACCOUNT_USD`, `IREMBOPAY_ACCOUNT_EUR`, keeping `IREMBOPAY_ACCOUNT` as an alias for RWF. In production mode, fill missing accounts from `PRODUCTION_ACCOUNTS`. In sandbox mode, fill from `SANDBOX_CATALOG.account`.
- **Account correction on a live row:** if `paymentAccountIdentifier === 'RMC-RWF'` (the sandbox value) and the mode is production, replace it with `RMC_RWF`. Apply the same rule as the existing sandbox-URL scrub at lines 132-137.
- **Keys:** the current rule "the row's credentials win over the env" would keep the *sandbox* keys on the row when the production keys arrive. Add: if `IREMBOPAY_MODE=production` **and** env keys are present **and** they differ from the row, overwrite the row and log both fingerprints. This needs the explicit production mode, so a stray re-run in sandbox mode can never replace live keys.
- Move product mapping out of 09 into 10. 09 then only handles the settings row.

### 5.3 Admin UI
- [paymentSettingsApi.ts:212](../apps/frontend/src/lib/paymentSettingsApi.ts#L212): add `{ key: 'paymentAccountIdentifierEur', label: 'Payment Account (EUR)', placeholder: 'e.g. RMC_EUR' }`. Relabel the RWF field "Payment Account (RWF)", with placeholder `RMC_RWF`.
- [IremboPayProductsTab.tsx](../apps/frontend/src/app/[locale]/admin/settings/_components/payment/IremboPayProductsTab.tsx): add **Currency** and **Environment** columns. Add an environment filter that defaults to the live mode. Show a red "unmapped" badge per active type × currency that has an account configured.
- The admin DTO for upserting a mapping (`irembopay-admin.controller.ts`) gains `currency` (`IsIn RWF/USD/EUR`) and `environment`.
- The admin Test-payment panel (`PaymentTestingTab.tsx`) gains a currency selector. Hide the MSISDN field for USD/EUR.

### 5.4 Configuration reference

**`apps/backend/.env.example`** (template only; real values go in the server's gitignored `.env`):

```dotenv
# ── IremboPay ────────────────────────────────────────────────────────────────
# sandbox | production. Never inferred from the key prefix.
IREMBOPAY_MODE=
IREMBOPAY_SECRET_KEY=          # Portal → Integration Details → View Token
IREMBOPAY_PUBLIC_KEY=
IREMBOPAY_ACCOUNT_RWF=         # production: RMC_RWF   sandbox: RMC-RWF
IREMBOPAY_ACCOUNT_USD=         # production: RMC_USD
IREMBOPAY_ACCOUNT_EUR=         # production: RMC_EUR
IREMBOPAY_ACCOUNT=             # deprecated alias of IREMBOPAY_ACCOUNT_RWF
IREMBOPAY_PRODUCT_CODE=        # sandbox catch-all only; production uses the 10-irembopay-catalog seed
IREMBOPAY_PRUNE=               # 1 = drop production mappings not in the catalog
IREMBOPAY_API_BASE=            # leave empty; derived from Test mode
IREMBOPAY_TEST_MSISDN=0781234567
```

**Runtime settings** (`payment_method_settings.settings` for `IREMBOPAY`, `is_test_mode = false`):

| Key | Production value |
|---|---|
| `secretKey` | from the password manager (masked in UI) |
| `publicKey` | from the password manager |
| `paymentAccountIdentifier` | `RMC_RWF` |
| `paymentAccountIdentifierUsd` | `RMC_USD` |
| `paymentAccountIdentifierEur` | `RMC_EUR` |
| `apiBaseUrl` / `widgetScriptUrl` | **empty**, derived as `api.irembopay.com` / `dashboard.irembopay.com/.../inline.js` |
| `apiVersion` | `3` |
| `invoiceExpiryMinutes` | `1440` |
| `defaultLanguage` | `EN` |
| `signatureToleranceSeconds` | `300` |
| `simulatorMode` | `off` (also forced off when `NODE_ENV=production`) |
| `callbackUrl` (display only) | `https://api.rwandamuslim.org/api/v1/webhooks/irembopay` |

**IremboPay production portal** (Admin merchant):
- Callback URL: `https://api.rwandamuslim.org/api/v1/webhooks/irembopay`
- Confirm the 3 payment accounts and 14 products are **active**.

**Infrastructure:**
- The webhook route must accept the raw body. This is already the case (`main.ts` raw-body for `/webhooks/irembopay`). Do not put a WAF or body-rewriting proxy in front of it.
- If production egress is IP-restricted, allow `api.irembopay.com:443`. If IremboPay publishes webhook source IPs, allow them to `/api/v1/webhooks/irembopay`. Ask them (Q5).
- Frontend CSP `script-src` and `frame-src`: allow `https://dashboard.irembopay.com`.

---

## Testing

| Layer | Cases |
|---|---|
| Unit: `accountForCurrency` | RWF/USD/EUR resolve. EUR with no EUR account **throws** (regression for the 50 RWF bug). Lower-case input is accepted. |
| Unit: `resolveForCharge` | Rate row beats type default. Currency filter. Environment filter. No cross-currency fallback. No cross-env fallback. The error message names type, currency and env. |
| Unit: `donationPaymentTypeKey` | Each niyyah, category and fund combination, and the default. |
| Unit: catalog seed | Rejects a bad code (`PC-4244ac5lef`). Idempotent across two runs. Updates only a changed code. Never touches sandbox rows. Prune only with the flag. |
| Unit: 09 seed | Production mode replaces the `RMC-RWF` account. Env keys overwrite row keys only in explicit production mode. |
| Provider | USD + momo → 400 before any HTTP call. EUR cart of Sadaqat + Zakat → one invoice, `RMC_EUR`, two items with the correct EUR codes. |
| Donations | Mixed-currency cart → 400. Currency `GBP` → 400. |
| Reconciliation | With mode production, `is_test = true` invoices are not polled. |
| Webhook | Currency or account mismatch → settles and records a warning event. |
| e2e (sandbox) | Existing `irembopay-charge-e2e.ts` and `irembopay-marriage-channel-e2e.ts` still pass in sandbox mode with `environment = 'sandbox'` mappings. |

Coverage targets follow the repo gate. Run `npm test --workspace apps/backend` and
the frontend `vitest` suites for `useIremboPayment`, `IremboPayWidget` and
`PaymentTestingTab`.

---

## Phase 6 — Cutover runbook

Prerequisites: Phases 1–5 merged and deployed, production keys received, and
someone with production portal access available for the whole window.
Recommended window: a weekday morning, outside Ramadan and Hajj registration.

| # | Step | Command / action | Verify |
|---|---|---|---|
| 1 | Snapshot sandbox state | On EC2: `npx ts-node scripts/irembopay-snapshot.ts` (from `apps/backend`) | JSON written. Fingerprints match the password manager. File moved to the password manager and deleted from the server. |
| 2 | Deploy code | `cd-production.yml` | `GET /api/v1/health` returns 200. |
| 3 | Migrate | `migrate-production.yml` (migration 081) | `\d payment_type_provider_products` shows `currency` and `environment`. Old rows are `sandbox`. `QURAN_SUPPORT` and `ZAKAT_FITR` exist. `ZAKAT` is active. |
| 4a | **Either** keys in the admin UI | Admin → Settings → Payments → IremboPay: paste secret + public key, turn **Test mode off**, save. Nothing else to set: production products carry their accounts. | Products tab (merchant = Production) shows the 14 codes each with `RMC_*`. |
| 4 | **Or** keys in server `.env` | `IREMBOPAY_MODE=production`, `IREMBOPAY_SECRET_KEY`, `IREMBOPAY_PUBLIC_KEY` (both are required, otherwise the seed refuses). `IREMBOPAY_ACCOUNT_*` is optional; it defaults to `RMC_*`. | `chmod 600 .env`. Nothing in git. |
| 5 | Seed | `seed-production.yml` (type `SEED`; use `--ref` on the branch until PR #19 merges) | Log: `keys replaced for production: …`, `test mode ON → OFF`, `PRODUCTION mode, accounts RWF=RMC_RWF USD=RMC_USD EUR=RMC_EUR`. The coverage matrix shows the 14 codes and **no** `WARNING` line. A `REFUSED` line means the keys were missing from `.env`. |
| 6 | Cross-check catalog | Open the production portal → Products, and compare all 14 codes with the coverage matrix character by character. | 14/14 match. |
| 7 | Portal callback | Production portal → callback URL = `https://api.rwandamuslim.org/api/v1/webhooks/irembopay` | Saved. |
| 8 | Admin UI check | Admin → Settings → Payments → IremboPay | Test mode **OFF**. API/widget URL fields empty. Three accounts filled. The Products tab (env = production) has no red badges on active types. |
| 9 | Retire sandbox invoices | `UPDATE irembopay_invoices SET payment_status='EXPIRED', updated_at=now() WHERE environment='sandbox' AND payment_status IN ('NEW','PARTIALLY_PAID');` Then mark the linked `PENDING` donations and applications `FAILED` with gateway message "sandbox invoice retired at cutover". | Counts are logged. No sandbox invoice remains open. |
| 10 | Live smoke: RWF MoMo | Admin test panel: 100 RWF, `DONATION`, a real MTN number owned by the team | Invoice `currency=RWF`, account `RMC_RWF`, item `PC-47fbbd81b8`. Push approved. Webhook received with a **valid signature**. `payment_transactions` is `SUCCESSFUL`. The portal shows the invoice paid. |
| 11 | Live smoke: USD card | $1, `DONATION` → widget, with a real card | `RMC_USD`, `PC-f908aacaa7`. Webhook OK. |
| 12 | Live smoke: EUR card | €1, `ZAKAT` | `RMC_EUR`, `PC-67b0929312`. Webhook OK. |
| 13 | Live smoke: services | Good Conduct (2 000 RWF) and Marriage (Mosque rate, real flow or admin test) | `PC-4ceb24218e`, `PC-4244ac51ef`. Application status advances. |
| 14 | Reconciliation | Create a 100 RWF invoice, do not pay it, wait for one cron cycle | It is polled and stays `NEW`, with no 401/404 in logs. |
| 15 | Refund smoke payments | Through the IremboPay portal or support (IremboPay has no refund API) | Finance has confirmed. |
| 16 | Announce | Re-enable public donate/services CTAs if they were hidden | — |

Monitor for 48 h: `payment_provider_events` errors grouped by code, webhook 4xx
count (a signature failure means a wrong secret), and the count of `PENDING`
donations older than 2 h.

### Rollback

| Situation | Action |
|---|---|
| Live charges fail (wrong account or product) | Fix the mapping in the Products tab. No deploy is needed, and the config cache is invalidated on save. |
| Key or merchant problem | Deactivate IremboPay in the admin UI. This stops **new** charges only. Webhooks and reconciliation continue for in-flight invoices (by design). Hide the payment CTAs. |
| Return to sandbox (staging or rehearsal only, never on the public site) | Put the sandbox keys back from the password manager, set `IREMBOPAY_MODE=sandbox`, and re-seed. The `environment='sandbox'` mappings are still there. |
| Migration 081 has to be reverted | `migration:revert`. `down()` drops the production rows and the columns. Sandbox rows survive. |

---

## Effort and order

| Phase | Est. | Blocked by keys? |
|---|---|---|
| P1 Preserve sandbox (script + gitignore) | 0.5 d | no |
| P2 Migration + entity | 0.5 d | no |
| P3 Config, resolution, provider, reconciliation, webhook | 1.5 d | no |
| P4 Donation routing + DTO guards + frontend method gating | 1 d | no (Q1/Q2 needed for 2 keys) |
| P5 Catalog seed, 09 changes, admin UI | 1.5 d | no |
| Tests | 1 d | no |
| P6 Runbook | 0.5 d window | **yes** |

About 6 dev-days, plus the cutover window.

---

## Open questions (send to RMC and IremboPay before Phase 4 is final)

1. **Zakat al-Fitr in the UI.** The donate page has the niyyahs `lillah`, `sadaqah` and `zakat`, but not Fitr. Should we add a `zakat-al-fitr` niyyah, shown only in RWF, ideally only during Ramadan?
2. **Qur'an Support.** Which donation category or sub-fund is it? The current categories are `school`, `charity`, `religious` and `events`. Proposal: a new `quran` sub-fund under `religious`, routed to `QURAN_SUPPORT`.
3. **`lillah` → Sadaqat.** Is it acceptable for general "for the sake of Allah" gifts to settle under the Sadaqat product?
4. **Hajj.** `HAJJ_FEE` is mapped (USD/RWF) but stays inactive until the Hajj payment flow is built. Confirm.
5. **IremboPay:** do they publish webhook source IPs? What is the notification retry policy in production? Is there a minimum amount per currency (for the $1/€1 smoke tests)? Is there a refund path for smoke payments?
6. **IremboPay:** confirm that card payments on `RMC_USD`/`RMC_EUR` invoices are enabled on the production merchant. MoMo cannot pay them.
