# IremboPay — Phased Implementation Plan (execution guide)

**Companion to:** [irembopay-integration-plan.md](docs/irembopay-integration-plan.md) (research + API reference)
**Audience:** whoever implements this — human or Claude Code
**Date:** 2026-08-21
**Repo:** `rmc-app` — backend `apps/backend`, frontend `apps/frontend`

---

## How to use this document

Nine phases, each independently shippable and independently revertable. Each phase states:

- **Goal** — one sentence.
- **Files** — exact paths to create/modify.
- **Steps** — what to write, with the non-obvious parts spelled out.
- **Done when** — checkable acceptance criteria.
- **Verify** — the command to run.

**Rules for the implementer:**

1. **Do not skip Phase 1.** Everything after it depends on the abstraction it introduces. Adding IremboPay without it means editing four domain services twice.
2. **One phase = one commit** (or one PR). Phases 1–6 touch no live payment path; Phase 8 is the first that changes real money flow.
3. **Never hardcode credentials.** Every key, URL, product code and account identifier is read from the database at runtime. If you find yourself typing a secret into a `.ts` file, stop — that's a bug in your approach, not a shortcut.
4. **Verify the doc's ambiguities against sandbox** rather than assuming (phone format, HTTP verbs — see §Known unknowns). Encode what you learn as a test.
5. Run `npm run lint && npm run build` in `apps/backend` before calling a phase done.

**Known unknowns to resolve during Phase 3** (the IremboPay docs contradict themselves):

| Question              | Conflicting claims                                                                                           | How to resolve                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| MoMo phone format     | request table says `07########`; `BAD_PHONE_NUMBER` says "more or less than 12 digits" (i.e. `250788123456`) | Call sandbox with both against test MSISDN `0781234567`; keep whichever returns 200   |
| Initiate-payment verb | page header says `GET`, body says `Method: POST`                                                             | POST (a body is required) — confirm with sandbox                                      |
| Header casing         | `irembopay-secretKey` vs `irembopay-secretkey`                                                               | Irrelevant — HTTP headers are case-insensitive (RFC 7230). Send `irembopay-secretKey` |
| Auth on initiate      | "This API does not require authentication" while listing auth headers                                        | Send the headers                                                                      |

---

## Current state — what you are building on

```
Domain services                        Gateway                     Persistence
─────────────────────────────────────────────────────────────────────────────────
donations.service.ts       ─┐
marriage.service.ts        ─┼─ inject ─► IntouchPayService ─────►  payment_transactions
good-conduct.service.ts    ─┤            (hardwired)              payment_provider_events
payment-settings.service.ts ┘
                                                                  payment_method_settings
POST /api/v1/webhooks/intouch-pay  ──►  PaymentSettingsService     (jsonb credential bag)
  (@Public, UNSIGNED)                    + 3 domain webhook services
                                         + PaymentEventsService (SSE)
```

Key facts you need and might otherwise waste time discovering:

| Fact                                                                                                            | Location                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Credentials live in a **jsonb bag**, not columns — new provider = new keys, no migration                        | [payment-method-settings.entity.ts](apps/backend/src/payment-settings/entities/payment-method-settings.entity.ts) |
| Sensitive fields masked with `••••••••` via a `SENSITIVE_FIELDS` map                                            | [payment-settings.service.ts:26](apps/backend/src/payment-settings/payment-settings.service.ts#L26)               |
| `isTestMode` boolean already on the settings entity — use it for sandbox/prod                                   | same entity                                                                                                       |
| Frontend credential form is **generated from a field descriptor array**                                         | [paymentSettingsApi.ts:151](apps/frontend/src/lib/paymentSettingsApi.ts#L151)                                     |
| Admin SSE stream already exists at `GET /admin/payment-settings/events`                                         | [payment-settings.controller.ts:216](apps/backend/src/payment-settings/payment-settings.controller.ts#L216)       |
| Migrations are hand-written, named `<timestamp>-<seq>-<slug>.ts`, class `Name<timestamp>`                       | [database/migrations/](apps/backend/src/database/migrations/)                                                     |
| Latest migration is `1790000000056-051-audit-log-action-length.ts`                                              | → yours is `1790000000057-052-…`                                                                                  |
| `main.ts` calls `NestFactory.create(AppModule)` with `app.use(json({limit:'2mb'}))` — **raw body is discarded** | [main.ts:14](apps/backend/src/main.ts#L14)                                                                        |
| Permissions enum: `PAYMENT_SETTINGS_VIEW` / `_MANAGE`                                                           | [permissions.enum.ts:120](apps/backend/src/common/types/permissions.enum.ts#L120)                                 |
| `PaymentTypeKey` enum lacks funeral/hajj/tender keys                                                            | [payment-type.entity.ts:12](apps/backend/src/payment-settings/entities/payment-type.entity.ts#L12)                |

---

# Phase 1 — Payment gateway abstraction

**Goal:** domain services stop knowing which gateway they use.

**Why first:** `donations`, `marriage`, `good-conduct` and `payment-settings` each construct IntouchPay-shaped arguments (`username`/`partnerPassword`/`accountNo`) inline. Adding a second gateway without a port means every future provider edits four call sites. This phase is pure refactor — no behaviour change, no new provider.

### Files

```
CREATE apps/backend/src/payments/payment-gateway.port.ts
CREATE apps/backend/src/payments/payment-gateway.service.ts
CREATE apps/backend/src/payments/payments.module.ts
CREATE apps/backend/src/payments/providers/intouch-pay.provider.ts
CREATE apps/backend/src/payments/payment-gateway.service.spec.ts
MODIFY apps/backend/src/app.module.ts                    (register PaymentsModule)
```

### Steps

**1.1** Define the port. This is the contract every provider satisfies:

```ts
// apps/backend/src/payments/payment-gateway.port.ts
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';

export type GatewayStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface PaymentChargeRequest {
  /** Our idempotency key. Deterministic per domain record — never random on retry. */
  transactionId: string;
  amount: number;
  currency: string; // 'RWF' unless the caller says otherwise
  paymentTypeKey: string; // DONATION | MARRIAGE_FEE | …
  referenceId?: string; // domain record id (donation.id, application.id)
  payer: { name?: string; phone?: string; email?: string };
  locale?: 'EN' | 'FR' | 'RW';
  description?: string;
  expiresAt?: Date;
  /** MoMo push only. Omit to create a payable invoice without pushing. */
  pushProvider?: 'MTN' | 'AIRTEL';
}

export interface PaymentChargeResult {
  provider: string; // 'intouchpay' | 'irembopay'
  status: GatewayStatus;
  /** invoiceNumber (IremboPay) or gateway transaction id (IntouchPay). */
  providerReference: string;
  /** Our transactionId, echoed for correlation. */
  transactionId: string;
  paymentLinkUrl?: string; // IremboPay
  publicKey?: string; // IremboPay widget
  widgetScriptUrl?: string; // IremboPay widget
  responseCode?: string;
  message?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentStatusResult {
  status: GatewayStatus;
  providerReference: string;
  paidAt?: Date;
  paidAmount?: number;
  balance?: number;
  providerPaymentMethod?: string; // MTN_MOMO | ONLINE_CARD | BK | …
  responseCode?: string;
  message?: string;
}

export interface PaymentGatewayProvider {
  readonly code: PaymentMethodCode;
  readonly providerName: string;
  isConfigured(): Promise<boolean>;
  charge(req: PaymentChargeRequest): Promise<PaymentChargeResult>;
  getStatus(reference: string): Promise<PaymentStatusResult>;
}
```

**1.2** `IntouchPayProvider` — a thin adapter, not a rewrite. It injects the existing `IntouchPayService` and `PaymentSettingsService`, pulls credentials via `getRawSettings(PaymentMethodCode.MOMO_INTOUCH)`, maps `PaymentChargeRequest` → `IntouchPayRequest`, and maps the result back. **Copy the existing behaviour exactly** — including the `requestTxnId|gatewayTxnId` reference format the webhook services parse (see [donation-webhook.service.ts:38](apps/backend/src/donations/donation-webhook.service.ts#L38)). Breaking that format silently breaks callback matching.

**1.3** `PaymentGatewayService` — the router:

```ts
@Injectable()
export class PaymentGatewayService {
  private readonly providers = new Map<PaymentMethodCode, PaymentGatewayProvider>();

  constructor(intouch: IntouchPayProvider /* , irembo: IremboPayProvider — Phase 4 */) {
    this.register(intouch);
  }

  register(p: PaymentGatewayProvider) { this.providers.set(p.code, p); }

  /** Resolve the provider for a payment type, falling back to the default active method. */
  async resolve(methodCode?: PaymentMethodCode): Promise<PaymentGatewayProvider> { … }

  async charge(req: PaymentChargeRequest, methodCode?: PaymentMethodCode) {
    const provider = await this.resolve(methodCode);
    if (!(await provider.isConfigured()))
      throw new BadRequestException(`${provider.providerName} is not configured…`);
    return provider.charge(req);
  }
}
```

Resolution order: explicit `methodCode` argument → the method configured for this payment type → the single active+configured method → throw a message naming the settings page.

**1.4** Do **not** migrate the domain services yet. Phase 1 only adds the abstraction and proves it works. Domain migration is Phase 8, after IremboPay is tested.

### Done when

- [ ] `PaymentGatewayService.charge()` routes an IntouchPay charge end-to-end with identical behaviour to the direct call.
- [ ] Unit test: unknown method → `BadRequestException` naming the settings page.
- [ ] Unit test: unconfigured provider → `BadRequestException`, no HTTP call attempted.
- [ ] No existing file's behaviour changed; all existing tests pass.

### Verify

```bash
cd apps/backend && npm run lint && npm run build && npm test -- payment-gateway
```

---

# Phase 2 — Database schema

**Goal:** persist IremboPay invoices, multi-provider transactions, and the product mapping.

### Files

```
CREATE apps/backend/src/database/migrations/1790000000057-052-irembopay-integration.ts
CREATE apps/backend/src/integrations/irembo-pay/entities/irembopay-invoice.entity.ts
CREATE apps/backend/src/payment-settings/entities/payment-type-provider-product.entity.ts
MODIFY apps/backend/src/payment-settings/entities/payment-method.entity.ts   (enum + IREMBOPAY)
MODIFY apps/backend/src/payment-settings/entities/payment-transaction.entity.ts
```

### Steps

**2.1** Add `IREMBOPAY = 'IREMBOPAY'` to `PaymentMethodCode`.

**2.2** Migration `up()` — five things, in this order:

```sql
-- 1. Seed the method, inactive until configured
INSERT INTO "payment_methods" ("name","code","description","is_active","sort_order")
VALUES ('IremboPay','IREMBOPAY','MoMo, card and bank payments via IremboPay', false, 1)
ON CONFLICT ("code") DO NOTHING;

-- 2. Multi-provider columns on the existing ledger
ALTER TABLE "payment_transactions"
  ADD COLUMN IF NOT EXISTS "provider" varchar(30) NOT NULL DEFAULT 'intouchpay',
  ADD COLUMN IF NOT EXISTS "invoice_number" varchar(50),
  ADD COLUMN IF NOT EXISTS "payment_link_url" text,
  ADD COLUMN IF NOT EXISTS "provider_payment_method" varchar(30),
  ADD COLUMN IF NOT EXISTS "paid_amount" numeric(12,2),
  ADD COLUMN IF NOT EXISTS "balance" numeric(12,2);
CREATE INDEX IF NOT EXISTS "IDX_ptx_invoice_number" ON "payment_transactions" ("invoice_number");
-- card/bank payers have no MSISDN
ALTER TABLE "payment_transactions" ALTER COLUMN "mobile_phone" DROP NOT NULL;

-- 3. Provider-side invoice mirror (reconciliation without re-querying the API)
CREATE TABLE IF NOT EXISTS "irembopay_invoices" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "transaction_id" varchar(100) NOT NULL UNIQUE,   -- OUR key
  "invoice_number" varchar(50) UNIQUE,             -- THEIR key
  "payment_account_identifier" varchar(50) NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'RWF',
  "payment_status" varchar(20) NOT NULL DEFAULT 'NEW',  -- NEW|PAID|PARTIALLY_PAID|EXPIRED
  "payment_method" varchar(30),
  "payment_reference" varchar(100),
  "payment_link_url" text,
  "expiry_at" timestamptz,
  "paid_at" timestamptz,
  "partial_payment_enabled" boolean NOT NULL DEFAULT false,
  "paid_amount" numeric(12,2),
  "balance" numeric(12,2),
  "payment_type_key" varchar(50),
  "reference_id" uuid,
  "is_test" boolean NOT NULL DEFAULT true,
  "raw_payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_status"  ON "irembopay_invoices" ("payment_status");
CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_ref"     ON "irembopay_invoices" ("reference_id");
CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_created" ON "irembopay_invoices" ("created_at");

-- 4. Product mapping — editable from Settings, never hardcoded
CREATE TABLE IF NOT EXISTS "payment_type_provider_products" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "provider" varchar(30) NOT NULL DEFAULT 'irembopay',
  "payment_type_id" uuid NOT NULL REFERENCES "payment_types"("id") ON DELETE CASCADE,
  "payment_type_rate_id" uuid REFERENCES "payment_type_rates"("id") ON DELETE CASCADE,
  "product_code" varchar(60) NOT NULL,
  "payment_account_identifier" varchar(50),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ptpp_provider_type_rate"
  ON "payment_type_provider_products" ("provider","payment_type_id", COALESCE("payment_type_rate_id",'00000000-0000-0000-0000-000000000000'::uuid));
```

`down()` reverses all of it (drop tables, drop columns, delete the seeded method row).

> Verify the actual table names `payment_types` / `payment_type_rates` before writing the FKs — read the entity `@Entity(...)` decorators, don't guess.

**2.3** Mirror the columns on the TypeORM entities. `provider_payment_method` is a free string, not an enum — IremboPay may add channels.

### Done when

- [ ] `npm run migration:run` applies cleanly against a fresh DB **and** an existing dev DB.
- [ ] `npm run migration:revert` fully reverses it.
- [ ] IremboPay appears in `GET /admin/payment-settings/methods` as inactive.
- [ ] Existing IntouchPay transactions read back with `provider = 'intouchpay'`.

### Verify

```bash
cd apps/backend && npm run migration:run && npm run migration:revert && npm run migration:run
```

---

# Phase 3 — IremboPay HTTP client

**Goal:** a tested, credential-driven client for the four endpoints. **No business logic here.**

### Files

```
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.types.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.config.service.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.client.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.service.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.module.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay.service.spec.ts
```

### Steps

**3.1 `irembo-pay.config.service.ts`** — the piece that makes settings live-editable:

```ts
export interface IremboPayConfig {
  secretKey: string;
  publicKey: string;
  paymentAccountIdentifier: string;
  apiBaseUrl: string; // resolved: override ?? (isTestMode ? sandbox : prod)
  widgetScriptUrl: string; // resolved the same way
  apiVersion: string; // default '3'
  invoiceExpiryMinutes: number; // default 1440
  defaultLanguage: 'EN' | 'FR' | 'RW';
  signatureToleranceSeconds: number; // default 300
  isTestMode: boolean;
}
```

- Read from `payment_method_settings` where method code = `IREMBOPAY` via `PaymentSettingsService.getRawSettings()` (**raw = unmasked**; the masked variant would send `••••••••` as the API key).
- Cache in memory for 60 s, and expose `invalidate()` called from `upsertMethodSettings()` so a save takes effect immediately.
- Resolve URLs: `apiBaseUrl` blank ⇒ `isTestMode ? 'https://api.sandbox.irembopay.com' : 'https://api.irembopay.com'`. Store the **host**; the client appends `/payments/...`.
- `isConfigured()` = `secretKey && publicKey && paymentAccountIdentifier` all non-empty.

**3.2 `irembo-pay.client.ts`** — one `request<T>()` method:

- Headers: `Content-Type: application/json`, `irembopay-secretKey: <secret>`, `X-API-Version: <version, per-call overridable>`.
- Timeout 30 s via `AbortController`.
- Unwrap `{success, message, data, errors}`; on `success === false` or non-2xx throw `IremboPayApiError` carrying `httpStatus`, `code` (`errors[0].code`), `detail`.
- Retry **only** 429 and 5xx, 3 attempts, exponential backoff (1s/2s/4s + jitter). **Never retry a 4xx** — retrying `DUPLICATE_TRANSACTION_ID` loops forever.
- **Redact the secret key** from every log line and error message. Log the URL, status, error code — never headers.
- Record a `PaymentProviderEvent` per attempt (`provider: 'irembopay'`, operation, outcome, latencyMs, attempt) reusing the existing entity. Extend its `PaymentOperation` union with `'create_invoice' | 'get_invoice' | 'initiate_push' | 'update_invoice'`.

**3.3 `irembo-pay.service.ts`** — four typed methods:

| Method                      | Call                                                                            |
| --------------------------- | ------------------------------------------------------------------------------- |
| `createInvoice(input)`      | `POST /payments/invoices`                                                       |
| `getInvoice(ref)`           | `GET /payments/invoices/{ref}` — `ref` = invoiceNumber **or** our transactionId |
| `initiateMomoPush(input)`   | `POST /payments/transactions/initiate`                                          |
| `updateInvoice(num, input)` | `PUT /payments/invoices/{num}` (partial payments)                               |

Details that will bite you:

- `expiryAt` must be RFC 3339 **with a timezone offset** (`2026-08-22T16:24:51.000+02:00`). `Date.toISOString()` emits `Z` — acceptable per RFC 3339, but assert against sandbox.
- Never send a total `amount`; IremboPay computes Σ(`unitAmount` × `quantity`).
- Normalise the payer phone in **one** helper, `normalizeMsisdn()`, so the format question has exactly one place to change once sandbox answers it.
- Map every documented error code to a human message in `irembo-pay.types.ts` (mirror the `INTOUCH_RESPONSE_CODES` pattern at [intouch-pay.service.ts:67](apps/backend/src/integrations/intouch-pay/intouch-pay.service.ts#L67)).

### Done when

- [ ] Unit tests with a mocked HTTP layer cover: success, 401 `AUTHENTICATION_FAILED`, 400 `DUPLICATE_TRANSACTION_ID`, 429-then-success retry, timeout.
- [ ] A test asserts the secret key appears in **no** log or thrown-error string.
- [ ] Sandbox smoke script creates a real 100 RWF invoice and returns an `invoiceNumber` + `paymentLinkUrl`.
- [ ] The phone-format and HTTP-verb unknowns are resolved and encoded as tests.

### Verify

```bash
cd apps/backend && npm test -- irembo-pay && npm run lint
```

---

# Phase 4 — Provider implementation

**Goal:** IremboPay satisfies `PaymentGatewayProvider` and is registered in the router.

### Files

```
CREATE apps/backend/src/payments/providers/irembo-pay.provider.ts
CREATE apps/backend/src/integrations/irembo-pay/irembopay-invoice.service.ts
MODIFY apps/backend/src/payments/payment-gateway.service.ts   (register)
MODIFY apps/backend/src/payments/payments.module.ts
```

### Steps

**4.1** `charge()`:

1. Resolve the product code + payment account from `payment_type_provider_products` for the request's `paymentTypeKey` (+ rate if given). Missing ⇒ throw a message naming the Products tab — not a generic 500.
2. `createInvoice(...)` with `transactionId`, one `paymentItems` entry, `expiryAt = now + invoiceExpiryMinutes`, customer, language from `locale`.
3. Persist an `irembopay_invoices` row **and** a `payment_transactions` row (`provider = 'irembopay'`, `status = PENDING`).
4. If `pushProvider` is set, call `initiateMomoPush`. Push failure is **not** invoice failure — the invoice stays payable by card/bank/link. Record the error, return `PENDING` with the message.
5. Return `providerReference = invoiceNumber`, plus `paymentLinkUrl`, `publicKey`, `widgetScriptUrl` for the widget.

**4.2** Idempotency: on `DUPLICATE_TRANSACTION_ID`, do **not** fail — `getInvoice(transactionId)` and return the existing invoice's state. Retries then converge instead of dead-ending.

**4.3** `getStatus(ref)` → `getInvoice`, mapping `paymentStatus`: `PAID` → `SUCCESSFUL`; `NEW`/`PARTIALLY_PAID` → `PENDING`; expired-and-unpaid → `FAILED`.

**4.4** Register in `PaymentGatewayService`.

### Done when

- [ ] `PaymentGatewayService.charge({…}, 'IREMBOPAY')` creates a sandbox invoice and persists both rows.
- [ ] Re-charging the same `transactionId` returns the same invoice — no duplicate row, no throw.
- [ ] Missing product mapping produces an actionable error naming the Products tab.
- [ ] MoMo push failure leaves a payable invoice.

### Verify

```bash
cd apps/backend && npm test -- irembo-pay.provider && npm run build
```

---

# Phase 5 — Signed webhook

**Goal:** accept IremboPay payment notifications, verify their signature, apply them exactly once.

**This is the highest-risk phase.** A mistake here either drops all payments or credits unpaid ones.

### Files

```
MODIFY apps/backend/src/main.ts                                   (raw body capture)
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay-signature.util.ts
CREATE apps/backend/src/integrations/irembo-pay/irembo-pay-signature.util.spec.ts
MODIFY apps/backend/src/webhooks/webhooks.controller.ts           (new route)
MODIFY apps/backend/src/webhooks/webhooks.module.ts
CREATE apps/backend/src/webhooks/irembo-pay-webhook.service.ts
```

### Steps

**5.1 Raw body — do this first or nothing else works.** The HMAC covers the **exact bytes received**. `main.ts` currently does `app.use(json({ limit: '2mb' }))`, which discards them. Add a `verify` hook:

```ts
app.use(
  json({
    limit: '2mb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl?.includes('/webhooks/irembopay')) req.rawBody = Buffer.from(buf);
    },
  }),
);
```

Scoped to the webhook path so we don't retain a 2 MB buffer on every request. Re-serialising the parsed object will **not** work: key order, whitespace and number formatting all differ from the wire bytes.

**5.2 `irembo-pay-signature.util.ts`:**

```ts
export function verifyIremboSignature(
  secretKey: string,
  rawBody: Buffer | string,
  header: string,
  toleranceSeconds = 300,
): { valid: boolean; reason?: string };
```

1. Parse `t=<ms>,s=<hex>` — split on `,` then on the **first** `=`.
2. `signedPayload =`${t}#${rawBody}``.
3. `expected = createHmac('sha256', secretKey).update(signedPayload).digest('hex')`.
4. **Compare lengths before `timingSafeEqual`** — it throws on unequal buffers, and an uncaught throw here becomes a 500 that tells an attacker their guess was the wrong length.
5. Reject if `Math.abs(Date.now() - Number(t)) > toleranceSeconds * 1000`. Note `t` is **milliseconds**.

**5.3 Route** on the existing controller — `@Public()`, `@SkipTransform()`, `@HttpCode(200)`:

```
POST /api/v1/webhooks/irembopay
```

Order matters:

1. Missing/invalid signature ⇒ log a warning, **return 200**, change nothing. Returning 4xx tells a prober whether their forgery was well-formed and makes IremboPay retry a request we will never accept.
2. Look up `irembopay_invoices` by `invoiceNumber`. Unknown ⇒ log, 200. (Could be another environment pointed at this URL.)
3. **Idempotency:** if the stored `paymentStatus` is already `PAID` and the payload says `PAID`, ack and stop. IremboPay's portal can re-push notifications — double-crediting a donation is the worst outcome available here.
4. Update the invoice row + `payment_transactions`; store `raw_payload`.
5. Dispatch to domain webhook services (same pattern as the IntouchPay route).
6. Emit SSE via `PaymentEventsService`.
7. Return `200` — **always**, even on internal error, wrapped in try/catch like the existing handler.

**5.4** Handle `PARTIALLY_PAID`: persist `paidAmount`/`balance`, leave the domain record pending until `PAID`.

### Done when

- [ ] Test: the doc's worked example (`t=1653405045000`, known key/body) verifies.
- [ ] Test: flipped byte in body ⇒ invalid. Wrong key ⇒ invalid. Timestamp 10 min old ⇒ invalid.
- [ ] Test: malformed header ⇒ `{valid:false}`, no throw.
- [ ] Test: same notification twice ⇒ domain record updated once.
- [ ] Every path returns HTTP 200.
- [ ] Manual: `curl` with a hand-computed signature flips a sandbox invoice to paid.

### Verify

```bash
cd apps/backend && npm test -- irembo-pay-signature && npm test -- webhooks
```

---

# Phase 6 — Settings UI (the flexibility requirement)

**Goal:** every IremboPay value is editable in **Admin → Settings → Payments**, with no redeploy.

### Files

```
MODIFY apps/backend/src/payment-settings/payment-settings.service.ts   (SENSITIVE_FIELDS, cache bust)
MODIFY apps/backend/src/payment-settings/payment-settings.controller.ts (product CRUD, test endpoints)
CREATE apps/backend/src/payment-settings/dto/upsert-provider-product.dto.ts
CREATE apps/backend/src/payment-settings/dto/test-irembopay.dto.ts
MODIFY apps/frontend/src/lib/paymentSettingsApi.ts                      (code, fields, labels, API fns)
MODIFY apps/frontend/src/app/[locale]/admin/settings/_components/payment/PaymentMethodSettingsTab.tsx
CREATE apps/frontend/src/app/[locale]/admin/settings/_components/payment/IremboPayProductsTab.tsx
MODIFY apps/frontend/src/app/[locale]/admin/settings/page.tsx           (register sub-tab)
```

### Steps

**6.1 Backend:** add `IREMBOPAY: ['secretKey']` to `SENSITIVE_FIELDS`; add `IREMBOPAY` to the `checkConfigured` required-field map (`secretKey`, `publicKey`, `paymentAccountIdentifier`); call `iremboConfig.invalidate()` at the end of `upsertMethodSettings`.

**6.2 Frontend field descriptors** — this is the whole "configurable" story; the form renders itself from this array:

```ts
IREMBOPAY: [
  { key: 'secretKey', label: 'Secret Key', required: true, sensitive: true,
    placeholder: 'From Portal → Integration Details → View Token' },
  { key: 'publicKey', label: 'Public Key', required: true,
    hint: 'Used by the inline payment widget in the browser' },
  { key: 'paymentAccountIdentifier', label: 'Payment Account (RWF)', required: true,
    placeholder: 'e.g. TST-RWF', hint: 'Determines the invoice currency' },
  { key: 'paymentAccountIdentifierUsd', label: 'Payment Account (USD)', placeholder: 'optional' },
  { key: 'apiBaseUrl', label: 'API Base URL', type: 'url',
    placeholder: 'https://api.sandbox.irembopay.com',
    hint: 'Leave empty to derive from the Test mode toggle' },
  { key: 'widgetScriptUrl', label: 'Widget Script URL', type: 'url',
    hint: 'Leave empty to derive from the Test mode toggle' },
  { key: 'apiVersion', label: 'API Version', type: 'select',
    options: [{value:'3',label:'v3 (partial payments)'},{value:'2',label:'v2'},{value:'1',label:'v1'}] },
  { key: 'callbackUrl', label: 'Callback URL', type: 'url',
    hint: 'Copy this into the IremboPay portal — we do not send it per request' },
  { key: 'invoiceExpiryMinutes', label: 'Invoice Expiry (minutes)', placeholder: '1440' },
  { key: 'defaultLanguage', label: 'Invoice Language', type: 'select',
    options: [{value:'EN',label:'English'},{value:'RW',label:'Kinyarwanda'},{value:'FR',label:'French'}] },
  { key: 'signatureToleranceSeconds', label: 'Signature Tolerance (seconds)', placeholder: '300' },
],
```

Also: add `'IREMBOPAY'` to the `PaymentMethodCode` union, `METHOD_LABELS`, and the icon map in `PaymentMethodSettingsTab.tsx`. The existing renderer handles masking, the password-confirm reveal, grid layout and validation — **no new credential UI**.

**6.3 Products tab** — table of payment types (and rates) with editable product code + payment account, backed by `GET/PUT /admin/payment-settings/providers/irembopay/products`. Guard with `PAYMENT_SETTINGS_MANAGE`. Flag unmapped types inline: an unmapped type fails at charge time, and the admin should see that before a payer does.

**6.4 Test panel** — two buttons, both `PAYMENT_SETTINGS_MANAGE`:

- **Test connection** → `POST /admin/payment-settings/test/irembopay/invoice` creates a 100 RWF sandbox invoice; show `invoiceNumber` + `paymentLinkUrl`.
- **Test MoMo push** → `POST /admin/payment-settings/test/irembopay/push` (default `0781234567`); subscribe to the existing SSE stream and show the status flip live.

### Done when

- [ ] IremboPay is configurable end-to-end from the UI; secret shows as `••••••••` and reveals only after password confirm.
- [ ] Toggling Test mode switches sandbox ⇄ production URLs with no redeploy.
- [ ] Saving settings takes effect on the very next API call (cache invalidated).
- [ ] Both test buttons work against sandbox.
- [ ] `GET /admin/payment-settings/methods/:id/settings` never returns the plaintext secret unless explicitly revealed.

### Verify

```bash
cd apps/frontend && npm run lint && npm run build
```

---

# Phase 7 — Reconciliation

**Goal:** a lost callback never means a lost payment.

### Files

```
CREATE apps/backend/src/integrations/irembo-pay/irembopay-reconciliation.service.ts
MODIFY apps/backend/src/integrations/irembo-pay/irembo-pay.module.ts
```

### Steps

- `@Cron` every 10 minutes (follow `donation-reconciliation.service.ts`).
- Select `irembopay_invoices` where `payment_status IN ('NEW','PARTIALLY_PAID')` **and** `created_at` between 5 minutes and 48 hours ago. The 5-minute floor avoids racing the webhook; 48 hours bounds the sweep.
- For each, `getInvoice(transactionId)` and, on change, apply it through the **same handler the webhook uses** — one code path, one set of bugs.
- Rate-limit: cap at ~50 invoices per run with backoff; a 429 storm helps nobody.
- Log a summary line per run.

**Why this matters more than for IntouchPay:** bank and branch payments legitimately complete hours later. "Paid at a BK branch on Saturday" is a normal event, not an edge case.

### Done when

- [ ] Deliberately dropped callback ⇒ reconciliation recovers the payment within one cycle.
- [ ] Already-`PAID` invoices are skipped (no redundant API calls).
- [ ] An admin "re-check this invoice" action exists on the transactions view.

---

# Phase 8 — Domain migration (first real money)

**Goal:** route a live service through IremboPay, reversibly.

### Order — least to most risk

1. **Donations** — highest volume, lowest per-transaction stakes, already reconciled.
2. **Marriage** + **Good Conduct** — fixed fees, webhook services already exist.
3. **Funeral, Hajj, Tenders, Scholarship** — Hajj gains native instalments.

### Steps

**8.1** Replace the direct `IntouchPayService` injection in `donations.service.ts` with `PaymentGatewayService`, building a `PaymentChargeRequest` instead of IntouchPay-shaped args.

**8.2** Extend `PaymentTypeKey` with the missing keys (`FUNERAL_FEE`, `HAJJ_FEE`, `TENDER_FEE`, `SCHOLARSHIP_FEE`) — a migration, since types are seeded rows.

**8.3** `irembo-pay-webhook.service.ts` dispatches to the same domain webhook services. Domain matching currently keys off IntouchPay's `requesttransactionid` prefixes (`DON-`, etc.) — **keep the same `transactionId` prefixes** for IremboPay so the matching logic is shared rather than duplicated.

**8.4** Roll out behind the settings toggle: sandbox → production with staff-only testing → public. Rollback is switching the active method back to `MOMO_INTOUCH`. No deploy either way.

### Done when

- [ ] A real donation completes via IremboPay: invoice created, MoMo push received, webhook applied, SMS sent, ledger row correct.
- [ ] Switching back to IntouchPay works with one settings change.
- [ ] Both providers' historical transactions render correctly in the admin list.

---

# Phase 9 — Widget & payer-facing flow

**Goal:** payers can use card and bank channels, not just MoMo push.

### Files

```
CREATE apps/frontend/src/components/payments/IremboPayWidget.tsx
CREATE apps/frontend/src/hooks/useIremboPayment.ts
MODIFY  the service payment steps (e.g. src/components/services/marriage/steps/Step6Payment.tsx)
```

### Steps

- Load the widget script **once** (idempotent loader keyed on URL; the URL comes from the backend, so sandbox/prod follows the settings toggle automatically).
- `IremboPay.initiate({ publicKey, invoiceNumber, locale, callback })`.
- **The widget callback is a UX signal only.** On success, poll `GET /payments/:transactionId/status` until the backend confirms via webhook. Never mark a payment complete on the widget's word — it runs on the payer's machine.
- Offer `paymentLinkUrl` as a "pay later / share this link" fallback.
- Locale from the app's i18n (`EN`/`FR`/`RW`) so IremboPay's own SMS matches the user's language.

### Done when

- [ ] Sandbox card `4242 4242 4242 4242` completes and the backend confirms.
- [ ] Failure card `5198 9602 2985 7244` surfaces a clear error and leaves the invoice payable.
- [ ] Closing the modal mid-payment leaves a recoverable pending invoice.
- [ ] Works on mobile viewports.

---

## Dependency graph

```
Phase 1 (port) ──┬─► Phase 4 (provider) ──┬─► Phase 8 (domain migration)
                 │        ▲               │
Phase 2 (schema) ┴────────┤               ├─► Phase 9 (widget)
                          │               │
Phase 3 (client) ─────────┘               │
                                          │
Phase 5 (webhook) ───────────────────────┤
Phase 6 (settings UI) ───────────────────┘
Phase 7 (reconciliation) ── after 5
```

Phases 2 and 3 can run in parallel with 1. Phase 6 can start once 2 lands. **Phase 8 requires 1–7 complete.**

---

## Estimate

| Phase                   | Days            |
| ----------------------- | --------------- |
| 1 — Gateway abstraction | 1.5             |
| 2 — Schema              | 0.5             |
| 3 — HTTP client         | 2               |
| 4 — Provider            | 1               |
| 5 — Signed webhook      | 1.5             |
| 6 — Settings UI         | 2.5             |
| 7 — Reconciliation      | 0.5             |
| 8 — Domain migration    | 1.5             |
| 9 — Widget              | 1.5             |
| **Total**               | **≈ 12.5 days** |

---

## Non-negotiables

1. **No secrets in code.** Not in `.ts`, not in fixtures, not in `docs/`. Settings UI or gitignored `.env` only.
2. **Webhook returns 200, always.** Even on invalid signature, unknown invoice, or internal error.
3. **Idempotency everywhere.** `transactionId` is deterministic; webhook and reconciliation both no-op on terminal states.
4. **The webhook is the only source of truth** for payment success. Not the widget callback, not the push response.
5. **Never retry a 4xx.**
6. **Verify the doc's ambiguities against sandbox** and encode the answers as tests.
7. **IntouchPay stays working** throughout. This is additive; nothing is decommissioned.
