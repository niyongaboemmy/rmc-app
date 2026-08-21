# IremboPay Integration — Research Report & Implementation Plan

**Author:** Backend / API integrations
**Date:** 2026-08-21
**Status:** Proposal — sandbox merchant account available; API keys to be pulled from the portal
**Scope:** Add IremboPay as a first-class payment method alongside the existing IntouchPay (MoMo) gateway, fully configurable from **Admin → Settings → Payments** without redeploys.

---

## 0. Sandbox access & credential handling

### 0.1 Endpoints and portal

| Purpose | URL |
| --- | --- |
| API documentation | `https://irembopay.gitbook.io/irembopay-api-docs` |
| Sandbox API base | `https://api.sandbox.irembopay.com/payments` |
| Sandbox widget script | `https://dashboard.sandbox.irembopay.com/assets/payment/inline.js` |
| Sandbox merchant portal | `https://dashboard.sandbox.irembopay.com/auth/login` |

The sandbox merchant account exists (a `@yopmail.com` disposable mailbox; login is 2FA'd by an OTP read from `https://yopmail.com/` by typing the mailbox name into "Type the email name"). **The username and password are deliberately not recorded in this file** — `docs/` is tracked by git, and committing a live login, even a sandbox one, puts it in the history permanently. They live in the team password manager; see §0.3.

### 0.2 One-time portal setup (prerequisite for any code to work)

Performed once by an admin in the sandbox portal, then repeated in production after certification:

1. **Get the API keys** — *Integration Details → View Token* yields the **secret key** (`irembopay-secretKey` header) and the **public key** (inline widget).
2. **Create a Payment Account** — this is what money settles into, and it **fixes the invoice currency**. Its identifier (e.g. `TST-RWF`) goes into settings. Create one per currency we intend to accept.
3. **Create Products** — one per thing we charge for. Each yields a product `code` (e.g. `PI-3e5fe23f2d`) used in `paymentItems`. These map to our payment types/rates via the Products tab (§4.4).
4. **Configure the callback URL** — point it at `https://<api-host>/api/v1/webhooks/irembopay` (§4.5). This is set in the portal, not per-request.

### 0.3 Where each value belongs

Nothing below is hardcoded or committed. Every value is entered through **Admin → Settings → Payments → IremboPay** and stored in `payment_method_settings.settings` (jsonb), with the secret key masked at rest in the API response:

| Value | Source | Destination |
| --- | --- | --- |
| Secret key | Portal → Integration Details → View Token | Settings → IremboPay → Secret Key *(masked, sensitive)* |
| Public key | Same | Settings → IremboPay → Public Key |
| Payment account identifier | Portal → Payment Accounts | Settings → IremboPay → Payment Account |
| Product codes | Portal → Products | Settings → Payment Types → product mapping |
| Callback URL | Ours | Portal → callback configuration |
| Portal login + OTP mailbox | Team password manager | Never in the repo, never in `.env` |
| Production keys | Issued after sandbox certification | Same settings fields; flip `isTestMode` off |

> **Handling rule:** sandbox keys are still keys. They go in the settings UI or a local `.env` that is gitignored — never into `docs/`, source, fixtures, or test snapshots. The HTTP client redacts them from logs (§4.2).

---

## 1. Why IremboPay

Today all money flows through **IntouchPay** (`apps/backend/src/integrations/intouch-pay/`), which gives us MTN/Airtel MoMo push only. IremboPay is a single integration that adds:

| Channel | IntouchPay (today) | IremboPay (proposed) |
| --- | --- | --- |
| MTN MoMo push | ✅ | ✅ |
| Airtel Money push | ✅ | ✅ |
| Visa / Mastercard / Amex | ❌ | ✅ (hosted widget, no PCI scope for us) |
| Bank channels (BK, I&M, Equity, Ecobank, BPR, GT) — branch, agent, USSD, internet & mobile banking | ❌ (manual bank transfer only) | ✅ via invoice number |
| Payment link (shareable URL / e-mail / SMS) | ❌ | ✅ `paymentLinkUrl` |
| Multi-currency (RWF, USD, EUR, GBP) | ❌ | ✅ (card/bank; MoMo push is RWF-only) |
| Partial payments / installments | ❌ (hand-rolled) | ✅ native, API v3 |
| Recurring card subscriptions | ❌ | ✅ (API v2 subscriptions) |
| Signed webhooks (HMAC-SHA256) | ❌ (unauthenticated callback) | ✅ `irembopay-signature` |

The last row matters for us specifically: our current `POST /api/v1/webhooks/intouch-pay` endpoint is `@Public()` and **unauthenticated** — anything that can guess a `requesttransactionid` can post a fake "paid". IremboPay's signed notifications let us close that class of hole for the new provider from day one.

**Strategic fit:** funeral, hajj, marriage, good-conduct and tender fees are the kind of one-off, invoice-shaped payments IremboPay is built for; hajj instalments map directly onto its partial-payment plans; scholarship/school fees benefit from card + bank reach for diaspora payers.

---

## 2. IremboPay API — technical reference

### 2.1 Base URLs & headers

| | Sandbox | Production |
| --- | --- | --- |
| REST API host | `https://api.sandbox.irembopay.com` | `https://api.irembopay.com` |
| Widget JS | `https://dashboard.sandbox.irembopay.com/assets/payment/inline.js` | `https://dashboard.irembopay.com/assets/payment/inline.js` |
| Merchant portal | `https://dashboard.sandbox.irembopay.com/auth/login` | `https://dashboard.irembopay.com` |

All payment endpoints sit under the `/payments` path, so the effective base is `https://api.sandbox.irembopay.com/payments` (+ `/invoices`, `/transactions/initiate`). We store the **host** in settings and let the client append `/payments/...`, so a future non-payment endpoint doesn't require re-configuring the base URL.

Every REST call:

```http
Content-Type: application/json
irembopay-secretKey: <merchant secret key>
X-API-Version: 3
```

> The docs are inconsistent about the header's casing (`irembopay-secretKey` vs `irembopay-secretkey`). HTTP headers are case-insensitive per RFC 7230, so either works; we will send `irembopay-secretKey` to match the majority of the v3 docs.

**API versions:** v1, v2 and v3 co-exist. We target **v3** — it is the only version supporting partial payments. (v2 additionally exposes card subscriptions/plans; if recurring membership dues are wanted later, that call is made with `X-API-Version: 2`. The version header is therefore a *per-call* concern, not a global constant — see §4.2.)

### 2.2 Uniform response envelope

```json
{ "success": true, "message": "string", "data": { }, "errors": [] }
```

`errors[]` entries are `{ "code": "...", "detail": "..." }`.

| HTTP | Meaning |
| --- | --- |
| 200 / 201 | Success |
| 400 | Missing / malformed parameters |
| 401 | `AUTHENTICATION_FAILED` — "Invalid IremboPay secret key" |
| 404 | Resource not found |
| 429 | Rate limited — **exponential backoff required** |
| 500/502/503/504 | Upstream error — retry idempotently |

### 2.3 Core concepts

| Concept | Meaning | Our mapping |
| --- | --- | --- |
| **Merchant** | RMC | — |
| **Product** | Why money is collected; has a `code` | one product code per `payment_type` / `payment_type_rate` |
| **Payment Account** | Bank account money lands in; **determines the invoice currency** | `paymentAccountIdentifier` in settings (per-currency) |
| **Invoice** | The payable object; yields an `invoiceNumber` | new `irembopay_invoices` row |
| **Portal** | Where keys, products, accounts and the callback URL are managed | one-time admin setup |

### 2.4 Create Invoice — `POST /payments/invoices`

Request:

```json
{
  "transactionId": "RMC-FUNERAL-8f21c4",
  "paymentAccountIdentifier": "TST-RWF",
  "paymentItems": [{ "code": "PI-3e5fe23f2d", "quantity": 1, "unitAmount": 5000 }],
  "expiryAt": "2026-08-22T16:24:51.000+02:00",
  "description": "Funeral transport request #8f21c4",
  "language": "RW",
  "customer": { "name": "Jixle Manzi", "phoneNumber": "0780000001", "email": "x@y.rw" }
}
```

- `transactionId` — **our** unique id. Reused → `DUPLICATE_TRANSACTION_ID` (400). This is our idempotency key.
- `amount` is computed by IremboPay as Σ(`unitAmount` × `quantity`) — we never send a total.
- `expiryAt` — RFC 3339 **with offset**. `BAD_EXPIRATION_DATE` if past or malformed.
- `language` — `EN` | `FR` | `RW` → drives IremboPay's own SMS/e-mail to the customer. Feed it from our i18n locale.
- Optional partial payment: `partialPaymentEnabled: true` + `installmentPlan: "FLAT" | "PERCENTAGE"` + `installments[]` (`FLAT` amounts must sum to the invoice total; `PERCENTAGE` values must sum to exactly 100, each ≥ 1; RWF amounts round to whole numbers).

Response `data`: `invoiceNumber`, `transactionId`, `paymentAccountIdentifier`, `paymentItems`, `paymentStatus` (`NEW`), `amount`, `currency`, `type` (`SINGLE`|`BATCH`), `createdAt`, `updatedAt`, `expiryAt`, `customer`, `description`, **`paymentLinkUrl`**.

Errors: `TRANSACTION_ID_MISSING`, `DUPLICATE_TRANSACTION_ID`, `PRODUCT_MISSING`, `BAD_PRODUCT`, `PAYMENT_ACCOUNT_MISSING`, `BAD_EXPIRATION_DATE`, `BAD_LANGUAGE`, `BAD_CUSTOMER_CONTACT`, `PAYMENT_ACCOUNT_NOT_FOUND`, `PRODUCT_NOT_FOUND`.

### 2.5 Get Invoice — `GET /payments/invoices/{invoice_reference}`

`{invoice_reference}` accepts **either** the `invoiceNumber` **or** our own `transactionId` — which means we can always recover state even if we lost the invoice number. Adds to the create-response fields: `paidAt`, `paymentReference`, `paymentMethod` (`MTN_MOMO`, `AIRTEL_MONEY`, `EQUITY`, `BK`, `ONLINE_CARD`), `batchNumber`, `childInvoices`. Error: `INVOICE_NOT_FOUND` (404).

`paymentStatus`: `NEW` → `PAID`, plus `PARTIALLY_PAID` when partial payments are enabled.

### 2.6 Initiate MoMo push — `POST /payments/transactions/initiate`

```json
{ "accountIdentifier": "0781234567", "paymentProvider": "MTN", "invoiceNumber": "880519183280" }
```

- `paymentProvider`: `MTN` | `AIRTEL`. Sending an MTN MSISDN with `AIRTEL` (or vice versa) → `PAYMENT_PROVIDER_ERROR`.
- Response `data`: `accountIdentifier`, `paymentProvider`, `invoiceNumber`, `amount`, `referenceId`.
- **Phone-format trap:** the request table says `07########` while `BAD_PHONE_NUMBER` says "more or less than **12** digits" (i.e. `250788123456`). We will normalise to the local `07…` form the field description mandates, keep the raw input, and confirm against sandbox during integration testing. This is exactly the kind of thing that must be verified, not assumed.
- MoMo push is **RWF only** — a non-RWF invoice returns `BAD_DATA`.
- Errors: `PHONE_NUMBER_MISSING`, `INVOICE_EXPIRED`, `INVOICE_ALREADY_PAID`, `INVOICE_ALREADY_IN_BATCH`, `BAD_DATA`, `BAD_PAYMENT_PROVIDER`, `INVOICE_MISSING`, `PAYMENT_PROVIDER_ERROR`, `BAD_PHONE_NUMBER`, `INVOICE_NOT_FOUND`.

> The doc page header mislabels this as `GET` and claims "This API does not require authentication" while simultaneously listing the auth headers. Treat as **POST, authenticated**.

### 2.7 Payment notification (webhook) — `POST <our callback URL>`

Header: `irembopay-signature: t=<unix-ms>,s=<hex hmac>`

```
s = HMAC_SHA256(secretKey, `${t}#${rawRequestBody}`)  // hex
```

Verification: split on `,` then `=` → `t`, `s`; recompute over `t + "#" + rawBody`; compare in constant time; reject if `|now − t| > 5 min` (replay window).

**Critical:** the HMAC is over the **raw request body bytes**, not a re-serialised object. Nest's default JSON body parser discards the raw buffer — we must capture it (see §4.5) or every signature check fails.

Payload (`data`): `amount`, `invoiceNumber`, `transactionId`, `createdAt`, `updatedAt`, `paidAt`, `expiryAt`, `paymentMethod` (e.g. `MOMO_PUSH`), `paymentReference`, `customer`, `paymentItems`, `paymentAccountIdentifier`, `paymentStatus`, `currency`. With partial payments, adds `partialPaymentEnabled`, `paidAmount`, `balance`, and a top-level `event` field.

The callback URL is configured **in the IremboPay portal**, not per-request. The portal also supports **re-pushing notifications** for paid invoices — our recovery path when a callback is lost.

### 2.8 Inline JS widget (frontend)

```html
<script src="https://dashboard.sandbox.irembopay.com/assets/payment/inline.js"></script>
<script>
  IremboPay.initiate({
    publicKey: "<public key>",
    invoiceNumber: "<from our backend>",
    locale: IremboPay.locale.EN,
    callback: (err, resp) => { /* success → poll our backend, never trust this alone */ }
  });
</script>
```

The widget renders MoMo, Airtel and card options and keeps card PAN entry entirely off our infrastructure. **The widget callback is a UX signal only — the webhook is the source of truth.**

### 2.9 Sandbox test data

| Channel | Success | Failure |
| --- | --- | --- |
| MTN MoMo | `0781234567` | `0780123456` |
| Airtel Money | (per docs, Airtel test MSISDN) | — |
| Visa | `4242 4242 4242 4242`, exp `01/35`, CVV `123` | `5198 9602 2985 7244` |
| Mastercard | `5555 5555 5555 4444` | — |
| Amex | `3782 822463 10005`, CVV `1234` | — |

Never enter real card details in sandbox; no money moves.

---

## 3. How this fits the current codebase

### 3.1 What already exists (and is reusable almost unchanged)

| Asset | Path | Reuse |
| --- | --- | --- |
| `payment_methods` (code enum + active toggle + sort order) | [payment-method.entity.ts](apps/backend/src/payment-settings/entities/payment-method.entity.ts) | add `IREMBOPAY` |
| `payment_method_settings` — **`jsonb` credential bag + `isTestMode` + `isConfigured` + masking** | [payment-method-settings.entity.ts](apps/backend/src/payment-settings/entities/payment-method-settings.entity.ts) | **exactly the flexibility asked for** — no schema change needed |
| `payment_transactions` ledger | [payment-transaction.entity.ts](apps/backend/src/payment-settings/entities/payment-transaction.entity.ts) | extend with provider + invoice fields |
| `payment_provider_events` (latency/outcome telemetry) | [payment-provider-event.entity.ts](apps/backend/src/integrations/intouch-pay/entities/payment-provider-event.entity.ts) | generalise `provider` (already a varchar defaulting to `intouchpay`) |
| SSE payment events → admin browsers | [payment-events.service.ts](apps/backend/src/payment-settings/payment-events.service.ts) | reuse verbatim |
| Admin settings API + permissions | [payment-settings.controller.ts](apps/backend/src/payment-settings/payment-settings.controller.ts) | add IremboPay test endpoints |
| Settings UI with sensitive-field masking + password-confirm reveal | [PaymentMethodSettingsTab.tsx](apps/frontend/src/app/[locale]/admin/settings/_components/payment/PaymentMethodSettingsTab.tsx) | **driven by a declarative field list** — adding IremboPay is a data change |
| Declarative credential field schema | [paymentSettingsApi.ts:151](apps/frontend/src/lib/paymentSettingsApi.ts#L151) | add an `IREMBOPAY` entry |
| Public webhook controller | [webhooks.controller.ts](apps/backend/src/webhooks/webhooks.controller.ts) | add a signed IremboPay route |

**The settings architecture already built for IntouchPay is the right shape for this.** `settings: jsonb` + a frontend field descriptor list means "update settings whenever needed through the interface" is satisfied by *adding rows and field definitions*, not by writing a new settings subsystem.

### 3.2 The one structural problem to fix

Four services — `donations`, `marriage`, `good-conduct`, and `payment-settings` itself — inject `IntouchPayService` **directly** and call `requestPayment()` with IntouchPay-shaped arguments (`username`/`partnerPassword`/`accountNo`). See e.g. [donations.service.ts:171](apps/backend/src/donations/donations.service.ts#L171). There is no provider abstraction; the gateway is hardwired into every domain service.

Bolting IremboPay in as a second hardwired dependency would double that coupling in four places and make a third provider unthinkable. So step one is a thin **payment gateway port**.

---

## 4. Implementation plan

### 4.1 Architecture

```
Domain services (donations, marriage, funeral, hajj, good-conduct, tenders, scholarship)
        │  charge({ typeKey, amount, currency, payer, referenceId, methodCode })
        ▼
   PaymentGatewayService            ← resolves the active method from DB settings
        │  (routes by PaymentMethodCode)
        ├──────────────► IntouchPayProvider   (existing service, wrapped)
        └──────────────► IremboPayProvider    (new)
                              │
                              ├─ createInvoice / getInvoice / initiateMomoPush
                              ├─ IremboPayConfigService  → payment_method_settings (jsonb, hot-reloaded)
                              └─ PaymentEventsService    → latency/outcome telemetry
```

Every provider implements one interface:

```ts
// apps/backend/src/payments/payment-gateway.port.ts
export interface PaymentChargeRequest {
  transactionId: string;          // our idempotency key
  amount: number;
  currency: string;               // 'RWF' default
  paymentTypeKey: string;         // DONATION, FUNERAL_TRANSPORT, HAJJ_FEE, …
  referenceId?: string;           // domain record id
  payer: { name?: string; phone?: string; email?: string };
  locale?: 'EN' | 'FR' | 'RW';
  description?: string;
  expiresAt?: Date;
}

export interface PaymentChargeResult {
  provider: 'intouchpay' | 'irembopay';
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  providerReference: string;      // invoiceNumber | gateway txn id
  paymentLinkUrl?: string;        // IremboPay only
  publicKey?: string;             // for the widget
  responseCode?: string;
  message?: string;
}

export interface PaymentGatewayProvider {
  readonly code: PaymentMethodCode;
  isConfigured(): Promise<boolean>;
  charge(req: PaymentChargeRequest): Promise<PaymentChargeResult>;
  getStatus(ref: string): Promise<PaymentStatusResult>;
}
```

Domain services then depend on `PaymentGatewayService`, never on a specific gateway. Switching donations from IntouchPay to IremboPay becomes a **settings toggle**, not a deploy.

### 4.2 New module — `apps/backend/src/integrations/irembo-pay/`

| File | Responsibility |
| --- | --- |
| `irembo-pay.module.ts` | wiring |
| `irembo-pay.config.service.ts` | reads/caches credentials from `payment_method_settings`; picks sandbox vs prod from `isTestMode`; invalidates cache on settings save |
| `irembo-pay.client.ts` | thin HTTP client: base URL, `irembopay-secretKey`, per-call `X-API-Version`, timeout, 429/5xx exponential backoff, envelope unwrapping, `IremboPayApiError` with `code`/`detail`, **secret redaction in logs** |
| `irembo-pay.service.ts` | `createInvoice`, `getInvoice`, `updateInvoice`, `initiateMomoPush`; emits `PaymentProviderEvent` per attempt |
| `irembo-pay.provider.ts` | implements `PaymentGatewayProvider` |
| `irembo-pay-signature.util.ts` | HMAC verify (constant-time + 5-min window) |
| `irembo-pay.types.ts` | request/response DTOs, error-code map, status enums |
| `irembo-pay.service.spec.ts` | unit tests (mirrors the existing `intouch-pay.service.spec.ts`) |

We write our own client rather than adopting `@irembo/irembopay-node-sdk`: our credentials live in the DB and change at runtime, we need per-attempt telemetry into `payment_provider_events`, and the surface is four endpoints. An SDK whose config is fixed at construction fights the whole "configurable from the UI" requirement.

### 4.3 Database changes (one migration)

Next migration in sequence: `1790000000057-052-irembopay-integration.ts`

1. **Seed** `payment_methods` row: `code = 'IREMBOPAY'`, name `IremboPay`, `is_active = false` (dark until configured), `sort_order` after MoMo.
2. **Extend `payment_transactions`:**
   - `provider varchar(30) not null default 'intouchpay'`
   - `invoice_number varchar(50) null` (+ index)
   - `payment_link_url text null`
   - `provider_payment_method varchar(30) null` (`MTN_MOMO`, `ONLINE_CARD`, `BK`, …)
   - `paid_amount numeric(12,2) null`, `balance numeric(12,2) null` (partial payments)
   - widen `currency` usage to allow `USD`/`EUR`/`GBP`
   - relax the `mobile_phone` NOT NULL — card and bank payers have no MSISDN
3. **New `irembopay_invoices`** — the provider-side mirror, so we can reconcile without re-querying the API:
   `id`, `transaction_id` (unique, our key), `invoice_number` (unique), `payment_account_identifier`, `amount`, `currency`, `payment_status`, `payment_method`, `payment_reference`, `payment_link_url`, `expiry_at`, `paid_at`, `partial_payment_enabled`, `paid_amount`, `balance`, `payment_type_key`, `reference_id`, `raw_payload jsonb`, timestamps.
4. **New `payment_type_provider_products`** — maps our `payment_type` / `payment_type_rate` to an IremboPay **product code** and **payment account identifier**, editable in Settings. Without this the product codes would be hardcoded, which is exactly what we're avoiding.
5. Add permission rows if a distinct `PAYMENT_SETTINGS_MANAGE` scope isn't sufficient (it is — reuse it).

### 4.4 Settings — everything configurable from the UI

**Backend:** no new settings machinery. `payment_method_settings.settings` (jsonb) holds:

| Key | Label | Sensitive | Notes |
| --- | --- | --- | --- |
| `secretKey` | Secret Key | ✅ | `irembopay-secretKey` header |
| `publicKey` | Public Key | — | inline widget |
| `paymentAccountIdentifier` | Payment Account (RWF) | — | e.g. `TST-RWF`; sets currency |
| `paymentAccountIdentifierUsd` | Payment Account (USD) | — | optional |
| `apiBaseUrl` | API Base URL | — | blank ⇒ derived from test-mode toggle |
| `widgetScriptUrl` | Widget Script URL | — | blank ⇒ derived |
| `apiVersion` | API Version | — | default `3` |
| `callbackUrl` | Callback URL | — | display/copy helper; actual value set in the IremboPay portal |
| `invoiceExpiryMinutes` | Invoice Expiry (minutes) | — | default `1440` |
| `defaultLanguage` | Invoice Language | — | `EN`/`FR`/`RW` |
| `enabledChannels` | Enabled Channels | — | multi-select MoMo / Card / Bank |
| `signatureToleranceSeconds` | Signature Tolerance | — | default `300` |

Add `IREMBOPAY: ['secretKey']` to `SENSITIVE_FIELDS` in [payment-settings.service.ts:26](apps/backend/src/payment-settings/payment-settings.service.ts#L26) so the secret is masked (`••••••••`) on read and only revealed behind the existing password-confirm modal.

`isTestMode` (already on the entity) switches sandbox ⇄ production **without a deploy** — that toggle drives both the API base URL and the widget script URL when the override fields are blank.

**Frontend:** add `'IREMBOPAY'` to `PaymentMethodCode`, an entry in `PAYMENT_METHOD_FIELDS`, `METHOD_LABELS`, and the icon map in `PaymentMethodSettingsTab.tsx`. The existing renderer handles text/url/select/sensitive fields, grid layout, masking and validation — **no new UI component required for credentials.** Two additions worth building:

- **Products tab** — map each payment type/rate → IremboPay product code + payment account (writes `payment_type_provider_products`).
- **Connection test** — "Test connection" (create a 100 RWF sandbox invoice, assert 201, then void/ignore) and "Test MoMo push" (create invoice + push to `0781234567`, watch the SSE stream flip to confirmed). This mirrors the existing `POST /admin/payment-settings/test/payment` flow.

**Cache invalidation:** `IremboPayConfigService` caches settings for ~60 s and is explicitly busted by `upsertMethodSettings()`, so a save takes effect on the next request.

### 4.5 Webhook endpoint

New route on the existing controller: `POST /api/v1/webhooks/irembopay`, `@Public()` + `@SkipTransform()`, always returns `200`.

Order of operations — **verify before you trust**:

1. **Raw body.** Register a `rawBody` capture for this path only. In `main.ts`, either `NestFactory.create(AppModule, { rawBody: true })` (Nest ≥ 9) or a scoped `bodyParser.json({ verify: (req, _res, buf) => { req.rawBody = buf } })`. Without this the HMAC will never match.
2. Parse `irembopay-signature` → `t`, `s`. Missing/malformed ⇒ log + `200` (never leak validity), no state change.
3. Recompute `HMAC_SHA256(secretKey, `${t}#${rawBody}`)`, compare with `crypto.timingSafeEqual` on equal-length buffers (guard the length first — `timingSafeEqual` throws on mismatch).
4. Reject if `|Date.now() − t| > signatureToleranceSeconds × 1000`.
5. **Idempotency.** Look up `irembopay_invoices` by `invoiceNumber`; if `paymentStatus` is already terminal and unchanged, ack and stop. IremboPay may re-push notifications from the portal — double-crediting a donation is the worst failure mode here.
6. Update `irembopay_invoices` + `payment_transactions`, then fan out to the domain webhook services (marriage, donations, good-conduct, funeral, hajj) through the same dispatcher pattern already in `webhooks.controller.ts`.
7. Emit SSE via `PaymentEventsService`.
8. Return `200` — **always**, even on internal error, matching the existing IntouchPay handler's discipline (a non-200 makes the provider retry against an endpoint we already know is broken).

### 4.6 Reconciliation safety net

A cron (pattern already in place — see `donation-reconciliation.service.ts`) sweeps `irembopay_invoices` where `paymentStatus IN ('NEW','PARTIALLY_PAID')` and `createdAt` between 5 minutes and 48 hours old, calls `GET /payments/invoices/{transactionId}`, and applies any status change through the *same* handler the webhook uses. This covers lost callbacks, our own downtime, and bank/branch payments completed hours later — the channel where "user pays at a BK branch on Saturday" is a normal event.

### 4.7 Frontend payment flow

Two supported UX paths, selected per service:

**A. Widget (recommended for web)** — backend `POST /payments/invoices` returns `{ invoiceNumber, publicKey, widgetScriptUrl }`; frontend loads the script once and calls `IremboPay.initiate(...)`; on the widget callback we **poll our own** `GET /payments/:transactionId/status` until the webhook lands. Gives card + MoMo + bank in one modal.

**B. Direct MoMo push (fastest for feature phones / existing flows)** — backend creates the invoice then immediately calls `initiate`; frontend shows "Approve on your phone" and subscribes to SSE, identical to today's donation UX.

`paymentLinkUrl` is stored on every invoice so admins can resend a payable link by SMS/e-mail for offline collection.

### 4.8 Rollout — per-service, reversible

Because routing is a DB setting, we migrate one service at a time and can roll back instantly:

1. **Donations** (highest volume, lowest per-transaction risk, already has reconciliation) — sandbox → 10% → 100%.
2. **Marriage & Good Conduct** (fixed fees, existing webhook services).
3. **Funeral transport, Hajj, Tenders, Scholarship** — Hajj gains native instalments.
4. Decommission nothing: IntouchPay stays as fallback behind the same port.

---

## 5. Work breakdown & estimate

| # | Task | Est. |
| --- | --- | --- |
| 1 | `PaymentGatewayProvider` port + `PaymentGatewayService` router; wrap existing IntouchPay | 1.5 d |
| 2 | `irembo-pay` module: config service, HTTP client, invoice + push APIs, telemetry | 2 d |
| 3 | Signature util + raw-body capture + webhook route + idempotency | 1 d |
| 4 | Migration `052-irembopay-integration` (method seed, tx columns, invoices table, product map) | 0.5 d |
| 5 | Settings API: credential fields, masking, product mapping CRUD, connection/push test endpoints | 1 d |
| 6 | Frontend: field schema, IremboPay tab, Products tab, test panel | 1.5 d |
| 7 | Frontend widget component + status polling hook | 1 d |
| 8 | Reconciliation cron + admin "re-check invoice" action | 0.5 d |
| 9 | Migrate donations onto the port; keep IntouchPay switchable | 1 d |
| 10 | Unit + e2e tests (signature, idempotency, error mapping, sandbox happy/fail paths) | 1.5 d |
| 11 | Sandbox certification run + production key swap | 0.5 d |
| | **Total** | **≈ 12 working days** |

---

## 6. Risks & mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Raw-body middleware not applied → every signature fails | Total webhook outage | Dedicated unit test with a known key/payload/signature triple; assert against the doc's worked example |
| Doc contradictions (MSISDN format, HTTP verb, header casing) | Runtime 400s | Verify each against sandbox during task 2; encode findings as tests, not assumptions |
| Replayed / duplicated notifications | Double-credited payments | Terminal-status idempotency check keyed on `invoiceNumber` (§4.5 step 5) |
| Secret key leaking into logs or API responses | Fraudulent charges | `SENSITIVE_FIELDS` masking + explicit redaction in the HTTP client's error logger + never log request headers |
| `DUPLICATE_TRANSACTION_ID` on retry | Stuck payment | `transactionId` is deterministic per domain record; on duplicate, `GET` the invoice and resume rather than failing |
| Currency mismatch (MoMo push is RWF-only) | `BAD_DATA` at push time | Validate currency against channel before push; surface a clear admin error |
| Production keys issued only after sandbox certification | Launch delay | Run the sandbox suite early (task 11 is a checkpoint, not a finale) |
| Provider outage | Payments halt | Router falls back to IntouchPay per payment type via settings toggle |

---

## 7. Open questions for IremboPay / RMC

1. Exact MoMo `accountIdentifier` format — `07XXXXXXXX` or `2507XXXXXXXX`?
2. Are separate payment accounts provisioned per currency, and do we need USD at launch (diaspora donations, Hajj)?
3. Product codes: one per payment type, or one per rate (e.g. each Hajj package)?
4. Sandbox and production are separate portals (`dashboard.sandbox.` vs `dashboard.`), so we assume separate merchant accounts with separate keys, products, payment accounts and callback URLs — confirm, and confirm whether products/accounts created in sandbox are replicated on approval or must be re-created by hand.
5. The sandbox account uses a disposable `yopmail.com` mailbox with no password on the inbox — fine for sandbox, but production must be moved to a controlled RMC mailbox before real keys are issued. Who owns that mailbox?
6. Settlement cadence and per-channel fees — needed for finance reconciliation reporting.
7. Retry policy for failed notifications: how many attempts, over what window, before manual re-push is required?

---

## 8. Definition of done

- [ ] IremboPay appears in Settings → Payments, fully configurable, secret masked, sandbox/production toggled from the UI.
- [ ] "Test connection" and "Test MoMo push" succeed against sandbox from the admin UI.
- [ ] Sandbox: successful and failed MTN, Airtel, and card payments each produce the correct final state in `payment_transactions`.
- [ ] Webhook rejects tampered payloads, stale timestamps, and duplicate deliveries — proven by tests.
- [ ] Reconciliation cron recovers a deliberately-dropped callback.
- [ ] Donations run end-to-end on IremboPay and can be switched back to IntouchPay with one settings change, no deploy.
- [ ] Production keys installed via the UI; a real 100 RWF transaction confirmed and reconciled.

---

## 9. Sources

- [IremboPay API Docs — index (llms.txt)](https://irembopay.gitbook.io/irembopay-api-docs/llms.txt)
- [About IremboPay API (v3)](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/getting-started/quickstart)
- [Definition of key concepts](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/getting-started/publish-your-docs)
- [How to integrate with IremboPay APIs](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/integration/editor)
- [Invoice management APIs — auth, envelope, status codes](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/integration/markdown)
- [Create Invoice](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/apis/invoice/openapi)
- [Get Invoice](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/apis/invoice/get-invoice)
- [Update Partial Payment Invoice](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/apis/invoice/update-partial-payment-invoice)
- [Initiate mobile money push payment](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/apis/payment/initiate-mobile-money-push-payment)
- [Payment notifications (webhook + signature)](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/apis/payment/payment-notifications)
- [Javascript widget integration](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/integration/accepting-payments-on-your-website/openapi)
- [Testing / sandbox test data](https://irembopay.gitbook.io/irembopay-api-docs/irembopay-api-docs-v3/integration/accepting-payments-on-your-website/interactive-blocks)
- [@irembo/irembopay-node-sdk (npm)](https://www.npmjs.com/package/@irembo/irembopay-node-sdk)
- [IremboPay product page](https://irembo.com/irembopay/)
