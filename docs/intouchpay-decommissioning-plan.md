# IntouchPay Decommissioning — Migration to IremboPay as the Sole Gateway

**Author:** Backend / API integrations
**Date:** 2026-08-22
**Status:** Proposal — depends on the IremboPay integration being live and certified
**Companions:** [irembopay-integration-plan.md](irembopay-integration-plan.md) (API research) · [irembopay-phased-implementation-plan.md](irembopay-phased-implementation-plan.md) (build guide, Phases 1–9)

**Scope:** remove IntouchPay from the RMC platform entirely and leave IremboPay as the only payment gateway — code, settings, webhooks, admin UI, and database seeds — without losing a single historical transaction and without a window in which money can be taken and not settled.

---

## 0. Executive summary

The two companion documents describe *adding* IremboPay next to IntouchPay. That work is largely built: a gateway port exists, both providers are registered behind it, and all three **charge** paths (donations, marriage, good conduct) already route through `PaymentGatewayService`. What is **not** done is the removal, and the removal is not symmetric with the addition — IntouchPay is still hardwired into six places the port never covered:

| Surface still bound to IntouchPay | Why it was never ported |
| --- | --- |
| **Status polling** in marriage, good conduct, donations | The port grew a `getStatus()`, but the applicant-facing "check my payment" paths still call `IntouchPayService.getTransactionStatus()` directly with `MOMO_INTOUCH` credentials |
| **Admin test harness** (`test/payment`, `test/deposit`, `balance`) | Written against IntouchPay's four endpoints before the port existed |
| **`handleIntouchCallback`** + the unsigned `POST /webhooks/intouch-pay` route | The IremboPay webhook writes the ledger through `IremboPayInvoiceService` instead — two parallel ledger writers |
| **Auto-deposit** (collect → callback → RequestDeposit) | An IntouchPay *certification* requirement, not a product feature |
| **Shared infrastructure** living under `integrations/intouch-pay/` | `PaymentEventsService`, `PaymentSimulatorService`, `PaymentDiagnosticsController` and the `PaymentProviderEvent` entity are provider-neutral but sit in the IntouchPay folder — the IremboPay module already imports across that boundary |
| **Frontend admin surface** | Balance banner, RequestDeposit direction toggle, `MOMO_INTOUCH` field descriptors and label/icon maps |

There is exactly **one genuine capability loss** and it must be a business decision before any code is deleted (§2.3): IremboPay is a *collections* gateway. It has no disbursement (`RequestDeposit`) and no balance-inquiry API. Everything IntouchPay does that IremboPay does not is on the payout side.

**Recommended shape of the migration:** cut over by *settings* first (zero code change, instantly reversible), soak, then delete code, then retire the DB rows — never the reverse. Estimated **6–7 working days** of engineering plus a soak period.

---

## 1. Where IntouchPay actually lives — full inventory

Everything below was verified against the working tree on 2026-08-22, not inferred from the earlier plans.

### 1.1 Backend — the IntouchPay module itself

```
apps/backend/src/integrations/intouch-pay/
  intouch-pay.service.ts            668 lines   ← the gateway client (DELETE)
  intouch-pay.service.spec.ts        84         ← (DELETE)
  intouch-pay.module.ts              15         ← (DELETE)
  payment-events.service.ts          98         ← provider-neutral SSE (RELOCATE)
  payment-simulator.service.ts       53         ← provider-neutral (RELOCATE, retarget)
  payment-diagnostics.controller.ts  86         ← provider-neutral (RELOCATE)
  entities/payment-provider-event.entity.ts 70  ← provider-neutral (RELOCATE)
```

Four of the seven files are **not IntouchPay code**. Deleting the folder wholesale breaks IremboPay: [irembo-pay.module.ts:3](apps/backend/src/integrations/irembo-pay/irembo-pay.module.ts#L3) and [irembo-pay.client.ts:7](apps/backend/src/integrations/irembo-pay/irembo-pay.client.ts#L7) both import `PaymentProviderEvent` from the IntouchPay path. This is the single most likely way to get this migration wrong.

`IntouchPayService` exposes four operations: `requestPayment`, `requestDeposit`, `getTransactionStatus`, `getBalance`, plus `resolveStatus()` and the `INTOUCH_RESPONSE_CODES` map — the last two are consumed *outside* the module by `PaymentSettingsService`.

### 1.2 Backend — the port and router (keep, simplify)

```
apps/backend/src/payments/
  payment-gateway.port.ts               (keep — strip IntouchPay wording)
  payment-gateway.service.ts            (keep — drop IntouchPayProvider from the ctor)
  payment-gateway.service.spec.ts       (rewrite — 14 IntouchPay assertions)
  payments.module.ts                    (drop IntouchPayModule + IntouchPayProvider)
  providers/intouch-pay.provider.ts     107 lines (DELETE)
  providers/intouch-pay.provider.spec.ts 179     (DELETE)
  payments-public.controller.ts         (drop the `provider: 'intouchpay'` branch, L67)
  payments-public.controller.spec.ts    (drop the "MoMo only" case, L69)
```

The router itself is provider-agnostic and survives unchanged in shape. **Do not collapse it back into a direct IremboPay dependency** — the abstraction is what makes a future third provider (or an IremboPay outage fallback) a settings change. Removing IntouchPay is removing a *provider*, not removing the *port*.

### 1.3 Backend — domain services

| File | Line | What is still IntouchPay-bound |
| --- | --- | --- |
| [donations.service.ts:348](apps/backend/src/donations/donations.service.ts#L348) | 348–360 | `refreshPaymentStatus` reads `MOMO_INTOUCH` creds and calls `intouchPay.getTransactionStatus` |
| [marriage.service.ts:980](apps/backend/src/marriage/marriage.service.ts#L980) | 980–1015 | `checkUserMomoPaymentStatus` — the applicant's waiting screen |
| [marriage.service.ts:1033](apps/backend/src/marriage/marriage.service.ts#L1033) | 1033–1060 | `adminGetMomoPaymentStatus` |
| [good-conduct.service.ts:436](apps/backend/src/good-conduct/good-conduct.service.ts#L436) | 436–450 | `refreshPaymentStatus` |
| `*.module.ts` × 3 | — | donations, marriage, good-conduct all still `imports: [IntouchPayModule]` |

Charge paths are already clean: `donations.service.ts:177` and `:292`, `marriage.service.ts:407` and `:886`, `good-conduct.service.ts:285` all call `paymentGateway.charge()`. Only the **read** side was left behind.

Also user-visible: [good-conduct-webhook.service.ts:80](apps/backend/src/webhooks/good-conduct-webhook.service.ts#L80) writes the literal string *"Payment confirmed via IntouchPay — request submitted"* into an application's history. That text reaches applicants.

### 1.4 Backend — payment settings (the largest single surface)

[payment-settings.service.ts](apps/backend/src/payment-settings/payment-settings.service.ts) is ~35 % IntouchPay by volume:

| Method | Lines | Fate |
| --- | --- | --- |
| `testPayment` | 289–347 | Replace with the IremboPay invoice/push test (already exists at `POST /admin/payments/test/irembopay/push`) |
| `testDeposit` | 351–405 | **No IremboPay equivalent** — see §2.3 |
| `checkTransactionStatus` | 409–446 | Reroute through `PaymentGatewayService.getStatus()` |
| `getAccountBalance` | 473–487 | **No IremboPay equivalent** — see §2.3 |
| `handleIntouchCallback` | 491–545 | Delete with the webhook route |
| `autoTriggerTestDeposit` | 548–598 | Delete (§2.3) |
| `SENSITIVE_FIELDS[MOMO_INTOUCH]` | 28 | Delete entry |
| `checkConfigured` required-fields map | 614 | Delete `MOMO_INTOUCH` entry |
| ctor `IntouchPayService` injection | 55 | Delete |

Controller routes to retire: `POST test/payment`, `POST test/deposit`, `GET balance` ([payment-settings.controller.ts:158,172,207](apps/backend/src/payment-settings/payment-settings.controller.ts#L158)). `GET test/payment/:txId/status` stays but must be re-pointed at the port.

### 1.5 Backend — webhooks

[webhooks.controller.ts:70–133](apps/backend/src/webhooks/webhooks.controller.ts#L70) — `POST /api/v1/webhooks/intouch-pay`, `@Public()`, **unsigned**. Anything that can guess a `requesttransactionid` (they are structurally guessable: `DON-<8 chars>-<epoch ms>`) can post a fake "paid" and settle a real donation. **Removing this route is a security improvement in its own right**, and is the strongest argument for not leaving IntouchPay dormant-but-wired.

Note the coupling that must survive: [irembo-pay-webhook.service.ts:151](apps/backend/src/webhooks/irembo-pay-webhook.service.ts#L151) deliberately synthesises an **IntouchPay-shaped payload** (`requesttransactionid`, `responsecode: '01'`, `status: 'Successfull'`) so the three domain webhook services stay shared. That translation layer is fine to keep as-is for now, but once IntouchPay is gone the shape is a fossil — see §5.2 for the optional follow-up.

### 1.6 Backend — database

| Migration | Content | Fate |
| --- | --- | --- |
| `1781957702483-019-payment-settings.ts:62` | Seeds the `MOMO_INTOUCH` row into `payment_methods` | **Never edit** — a shipped migration. Deactivate by new migration |
| `1781957702495-023-seed-momo-credentials.ts` | Seeds live IntouchPay credentials + gateway URL | **Never edit**. New migration clears the settings blob |
| `052-fix-momo-intouch-callback-url.ts` | Callback URL correction | Historical, leave |
| `037-payment-provider-events.ts:15` | `provider varchar(30) DEFAULT 'intouchpay'` | New migration: change the default to `'irembopay'` |
| `1790000000065-061-irembopay-integration.ts:37` | `payment_transactions.provider DEFAULT 'intouchpay'` | Same |

**Data that must be preserved forever:** every `payment_transactions` row with `provider = 'intouchpay'` / `payment_method_code = 'MOMO_INTOUCH'`, and every `payment_provider_events` row with `provider = 'intouchpay'`. These are the financial record. `payment_transactions.paymentMethodCode` is a plain `string` column ([payment-transaction.entity.ts:41](apps/backend/src/payment-settings/entities/payment-transaction.entity.ts#L41)), not an FK-constrained enum, so historical rows survive the code deletion — **but only if the `payment_methods` row is deactivated rather than deleted**, or admin transaction listings lose their method join.

### 1.7 Frontend

| File | What |
| --- | --- |
| [paymentSettingsApi.ts:217–224](apps/frontend/src/lib/paymentSettingsApi.ts#L217) | `MOMO_INTOUCH` credential field descriptors |
| [paymentSettingsApi.ts:5](apps/frontend/src/lib/paymentSettingsApi.ts#L5) | `PaymentMethodCode` union |
| [paymentSettingsApi.ts:188](apps/frontend/src/lib/paymentSettingsApi.ts#L188) | `provider: 'irembopay' \| 'intouchpay' \| null` |
| [paymentSettingsApi.ts:283](apps/frontend/src/lib/paymentSettingsApi.ts#L283) | `METHOD_LABELS` |
| `paymentSettingsApi.ts` L92/109/124/382/403 | `TestDepositPayload`, `direction: 'collect' \| 'deposit'`, `testDeposit()`, `getBalance()` |
| [PaymentTestingTab.tsx:600–760](apps/frontend/src/app/[locale]/admin/settings/_components/payment/PaymentTestingTab.tsx#L600) | Balance banner, deposit/payment direction toggle, "Send (RequestDeposit)" |
| [PaymentMethodSettingsTab.tsx:27,363–368](apps/frontend/src/app/[locale]/admin/settings/_components/payment/PaymentMethodSettingsTab.tsx#L363) | Icon map + "How IntouchPay works" help block |
| [PaymentMethodsTab.tsx:19,27](apps/frontend/src/app/[locale]/admin/settings/_components/payment/PaymentMethodsTab.tsx#L19) | Icon + gradient maps |
| [admin/marriage/[id]/page.tsx:1163](apps/frontend/src/app/[locale]/admin/marriage/[id]/page.tsx#L1163) | Panel titled "MoMo Payment (IntouchPay)" |
| [CartDrawer.tsx:345,407,462,517](apps/frontend/src/components/donate/CartDrawer.tsx#L345) | Comments + a 90-second "IntouchPay hasn't resolved" timeout branch |
| [MarriageWizard.tsx:536](apps/frontend/src/components/services/marriage/MarriageWizard.tsx#L536) | Widget-hiding comment keyed on IntouchPay being active |

The `momo`/`card` channel vocabulary in the donate and marriage wizards is **provider-neutral** and stays. Only the branches that exist *because* IntouchPay has no widget go away — once IremboPay is the only gateway, `supportsWidget` is always true and the conditional card option becomes unconditional.

### 1.8 ⚠️ What must NOT be touched — IntouchSMS

`apps/backend/src/integrations/sms/` talks to `https://www.intouchsms.co.rw/api/sendsms/.json` with `INTOUCH_USERNAME` / `INTOUCH_PASSWORD` / `INTOUCH_SENDER` / `INTOUCH_DLR_URL` ([sms.service.ts:13](apps/backend/src/integrations/sms/sms.service.ts#L13), [06-sms-config.seed.ts](apps/backend/src/database/seeds/06-sms-config.seed.ts)). This is **IntouchSMS**, a different product from **IntouchPay**, and it delivers every payment-confirmation SMS the platform sends — including the ones IremboPay payments trigger.

A naive `grep -ri intouch | xargs sed -i` deletes the SMS integration and silently stops all outbound messaging. Migrations `020`, `022`, `023` and the `sms_config` table are all in this category. **Rule for this migration: only ever match `intouchpay` / `IntouchPay` / `MOMO_INTOUCH` / `intouch-pay`, never the bare token `intouch`.**

---

## 2. Decisions required before code is written

### 2.1 Does IremboPay cover every channel IntouchPay served?

| Capability | IntouchPay | IremboPay | Verdict |
| --- | --- | --- | --- |
| MTN MoMo collection push | ✅ | ✅ `POST /payments/transactions/initiate` | Covered |
| Airtel Money collection push | ✅ | ✅ | Covered |
| Transaction status query | ✅ `GetTransactionStatus` | ✅ `GET /payments/invoices/{ref}` — accepts our own `transactionId` | Covered, and better (no gateway txn id needed) |
| Payment callback | ✅ unsigned | ✅ HMAC-SHA256 signed | Improvement |
| Card / bank / payment link | ❌ | ✅ | Gain |
| **Disbursement (send money out)** | ✅ `RequestDeposit` | ❌ | **Loss — §2.3** |
| **Merchant balance inquiry** | ✅ `GetBalance` | ❌ | **Loss — §2.3** |

Collections — which is all the platform actually does in production — are fully covered.

### 2.2 Is the platform certified on IremboPay production?

The IremboPay production keys are issued only after a sandbox certification run. **Do not begin Phase D3 (code deletion) until a real-money IremboPay transaction has settled and reconciled in production.** Until then IntouchPay is the rollback path, and the rollback path must remain executable.

### 2.3 The payout gap — decide this first

`testDeposit`, `getAccountBalance` and `autoTriggerTestDeposit` have no IremboPay equivalent. Assessment:

- `autoTriggerTestDeposit` is **scoped to `isTest`** ([payment-settings.service.ts:528](apps/backend/src/payment-settings/payment-settings.service.ts#L528)) and exists to prove the collect → callback → deposit cycle for **IntouchPay's own onboarding checklist**. It is a certification artifact, not a product feature. It dies with IntouchPay, correctly.
- `getAccountBalance` powers an admin banner only. No business logic reads it.
- `testDeposit` is the manual half of the same certification exercise.

**Recommendation:** delete all three. RMC does not disburse money through the platform.

**But confirm with finance and operations first**, because "we never pay anyone out" is a claim about the business, not about the code, and it is exactly the kind of thing that is true until the month someone needs to refund a donor. Three possible answers, and they change the plan:

| Answer | Consequence |
| --- | --- |
| *We never disburse* (expected) | Delete all three. Refunds handled manually through the bank. Proceed as written. |
| *We need refunds* | Check whether IremboPay's merchant portal offers refunds manually; if a **programmatic** refund is required, that is a separate IremboPay API investigation and this migration should not block on it — handle refunds out-of-band in the interim. |
| *We need bulk payouts* | IntouchPay's `RequestDeposit` cannot simply be kept — its credentials, module and telemetry would all have to survive. Scope a **standalone disbursement service** that is not part of the payment gateway port, and complete the collections migration independently. |

This is the only question in this document that can invalidate the plan, so ask it before D0.

### 2.4 Keep or drop the `MOMO_INTOUCH` enum member?

**Keep it, marked `@deprecated`.** Historical `payment_transactions` rows carry `payment_method_code = 'MOMO_INTOUCH'`; admin reporting joins on it. Removing the member from `PaymentMethodCode` costs nothing in safety and breaks every historical read. Same for the frontend `PaymentMethodCode` union.

What goes away is the *provider*, the *credentials*, the *routes*, and the method's `is_active` flag — not the vocabulary the archive is written in.

---

## 3. Migration phases

Nine phases, ordered so that the reversible ones come first and nothing is deleted while it is still the fallback. **D0–D2 change no code.**

### Phase D0 — Pre-flight (½ day)

**Goal:** prove IremboPay can carry 100 % of live traffic before anything is switched.

1. Answer §2.3 with finance/operations in writing.
2. Confirm IremboPay production keys are installed via **Admin → Settings → Payments → IremboPay**, `isTestMode` off.
3. Confirm every active `payment_type` / `payment_type_rate` has an IremboPay product mapping — an unmapped type throws a `BadRequest` at charge time, which in production means a payer who cannot pay. Use `GET /admin/payments/providers/irembopay/products`; the endpoint flags unmapped entries.
4. Confirm the IremboPay callback URL in the portal points at `https://<api-host>/api/v1/webhooks/irembopay`.
5. Snapshot the counts you will compare against later:
   ```sql
   SELECT provider, status, count(*) FROM payment_transactions GROUP BY 1,2;
   SELECT provider, outcome, count(*) FROM payment_provider_events
     WHERE created_at > now() - interval '30 days' GROUP BY 1,2;
   ```

**Done when:** every active payment type is mapped, and a 100 RWF production IremboPay payment has settled and reconciled.

---

### Phase D1 — Settings cutover (½ day, no deploy, instantly reversible)

**Goal:** all new money flows through IremboPay, with IntouchPay still able to settle what is already in flight.

1. **Admin → Settings → Payments**: set `IREMBOPAY.is_active = true`, `sort_order = 1`.
2. Set `MOMO_INTOUCH.is_active = false`.

That is the whole cutover. It works because of two properties already built into the system:

- `PaymentGatewayService.resolve()` filters candidates on `isActive` **and** `isConfigured` ([payment-gateway.service.ts:73](apps/backend/src/payments/payment-gateway.service.ts#L73)), so a deactivated method takes no new charges.
- `is_active` gates **new charges only** — IntouchPay's credentials stay readable while it is off, which is precisely what lets in-flight IntouchPay transactions settle through the still-mounted callback route during the soak.

**Rollback:** flip the two toggles back. Seconds, no deploy.

**Done when:** a fresh donation, a marriage fee and a good-conduct fee each produce an IremboPay invoice; `payment_transactions` shows `provider = 'irembopay'` for all new rows.

---

### Phase D2 — Soak (5–10 days, calendar time, no engineering)

**Goal:** let every in-flight IntouchPay transaction reach a terminal state.

Bank and branch channels settle over days, and both IntouchPay reconciliation crons run on the assumption that a pending row may resolve hours later. Watch:

```sql
SELECT count(*) FROM payment_transactions
 WHERE provider = 'intouchpay' AND status = 'PENDING';
```

Drive it to zero. Anything still pending after the soak is stuck for a reason unrelated to this migration; resolve it manually before deleting the code that can query it.

**Done when:** zero pending IntouchPay transactions for 48 consecutive hours, and no new `payment_provider_events` rows with `provider = 'intouchpay'`.

> This is the last phase that is free to reverse. From D3 onward, rollback means a revert-and-deploy.

---

### Phase D3 — Relocate the shared infrastructure (1 day)

**Goal:** make the IntouchPay folder deletable without taking IremboPay with it. **Pure move — no behaviour change.**

```
MOVE  integrations/intouch-pay/entities/payment-provider-event.entity.ts
  →   payments/entities/payment-provider-event.entity.ts
MOVE  integrations/intouch-pay/payment-events.service.ts
  →   payments/payment-events.service.ts
MOVE  integrations/intouch-pay/payment-simulator.service.ts
  →   payments/payment-simulator.service.ts
MOVE  integrations/intouch-pay/payment-diagnostics.controller.ts
  →   payments/payment-diagnostics.controller.ts
```

Steps:

1. Move the four files; keep class names, decorators and the `@Entity('payment_provider_events')` table name **byte-identical** — a renamed table name here is a silent data-loss migration.
2. Update every importer: `irembo-pay.module.ts`, `irembo-pay.client.ts`, `intouch-pay.module.ts` (still present at this point), `payment-settings.module.ts`, `webhooks.controller.ts`, `app.module.ts`.
3. Export `PaymentEventsService` and `PaymentSimulatorService` from `PaymentsModule`; register `PaymentProviderEvent` in the `TypeOrmModule.forFeature` list there.
4. Retarget `payment-simulator.service.ts` doc comments at IremboPay, and change [payment-events.service.ts:41](apps/backend/src/integrations/intouch-pay/payment-events.service.ts#L41)'s hardcoded `provider: 'intouchpay'` to take the provider from the caller (default `'irembopay'`).
5. In `payment-provider-event.entity.ts`, keep the IntouchPay operation literals (`request_payment`, `get_status`, `get_balance`, `deposit`) in the `PaymentOperation` union — **historical rows contain them** — but comment them as legacy.

**Verify:** `cd apps/backend && npm run lint && npm run build && npm test`
**Done when:** nothing outside `integrations/intouch-pay/` imports from `integrations/intouch-pay/`.

---

### Phase D4 — Port the status-polling paths (1 day)

**Goal:** the last direct `IntouchPayService` callers in domain code go through the port.

| File | Change |
| --- | --- |
| [donations.service.ts:340–370](apps/backend/src/donations/donations.service.ts#L340) | `refreshPaymentStatus` → `paymentGateway.getStatus(donation.paymentReference)` |
| [marriage.service.ts:936–1020](apps/backend/src/marriage/marriage.service.ts#L936) | `checkUserMomoPaymentStatus` → same |
| [marriage.service.ts:1022–1075](apps/backend/src/marriage/marriage.service.ts#L1022) | `adminGetMomoPaymentStatus` → same |
| [good-conduct.service.ts:369–460](apps/backend/src/good-conduct/good-conduct.service.ts#L369) | `refreshPaymentStatus` → same |
| [payment-settings.service.ts:409](apps/backend/src/payment-settings/payment-settings.service.ts#L409) | `checkTransactionStatus` → `paymentGateway.getStatus(tx.requestTransactionId)` |

Three things that are easy to get wrong here:

1. **Reference semantics differ.** IntouchPay's status call needs *both* `requestTransactionId` and the gateway's `transactionId`. IremboPay's `getStatus()` accepts an `invoiceNumber` **or** our own `transactionId` and resolves either ([irembo-pay.provider.ts:165](apps/backend/src/payments/providers/irembo-pay.provider.ts#L165)). Pass **our** transaction id — it is the value every domain record already stores, and it is what the webhook carries.
2. **`PaymentStatusResult` has no `responseCode` in IntouchPay's vocabulary.** The applicant-facing responses currently return `responseCode: '01'` / `'1000'`. Those codes reach the frontend. Map them from `PaymentStatusResult.status` at the controller boundary, or change the frontend to key on `status` — the latter is cleaner, and the marriage/good-conduct waiting screens are the only consumers.
3. **`getStatus()` has a side effect on IremboPay:** it calls `applyInvoiceState(invoice, 'reconciliation')`, which writes the ledger and can fan out to domain handlers. Polling it from a user-facing endpoint is therefore *also* a reconciliation trigger — which is desirable, but means the domain service must not additionally write the same state itself and double-apply. Read the existing update blocks carefully and let the invoice service own the ledger write.

Remove the `IntouchPayService` injection and the `IntouchPayModule` import from all three domain modules.

**Verify:** `npm test -- marriage good-conduct donations` and a manual poll of each waiting screen against sandbox.
**Done when:** `grep -rn "IntouchPayService" src/donations src/marriage src/good-conduct` is empty.

---

### Phase D5 — Rebuild the admin test harness on IremboPay (1 day)

**Goal:** the Payments settings page tests IremboPay, and offers nothing IremboPay cannot do.

**Backend:**

- Delete `testPayment`, `testDeposit`, `getAccountBalance`, `autoTriggerTestDeposit`, `handleIntouchCallback` and the `IntouchPayService` injection from `PaymentSettingsService`.
- Delete `SENSITIVE_FIELDS[MOMO_INTOUCH]` and the `MOMO_INTOUCH` entry in `checkConfigured`'s required-fields map.
- Delete routes `POST test/payment`, `POST test/deposit`, `GET balance` from `PaymentSettingsController`.
- Re-point `GET test/payment/:txId/status` at the rewritten `checkTransactionStatus`.
- The IremboPay replacements already exist and need no new backend work: `POST /admin/payments/test/irembopay/invoice`, `POST /admin/payments/test/irembopay/push`, `POST /admin/payments/test/irembopay/recheck/:reference`, `GET /admin/payments/irembopay/status`.

**Frontend — `PaymentTestingTab.tsx`:**

- Delete the balance banner (L600–620) and the collect/deposit direction toggle (L629–661, L753).
- Point the "send test payment" action at `test/irembopay/push`.
- Add a "re-check invoice" action wired to `test/irembopay/recheck/:reference` — this is the admin recovery for a lost callback and there is currently no UI for it.
- Keep the transactions list and the SSE stream verbatim; both are provider-neutral.

**Frontend — `paymentSettingsApi.ts`:** delete `TestDepositPayload`, `TestDepositResult`, `testDeposit()`, `getBalance()` and the `direction` field; delete the `MOMO_INTOUCH` entry from `PAYMENT_METHOD_FIELDS`; keep `MOMO_INTOUCH` in the `PaymentMethodCode` union and in `METHOD_LABELS` (relabel to **"Mobile Money (IntouchPay — retired)"**) so historical rows still render.

**Done when:** the Payments settings page has no control that calls a deleted endpoint, and the IremboPay connection + push tests both pass from the UI.

---

### Phase D6 — Remove the provider, module and unsigned webhook (1 day)

**Goal:** IntouchPay leaves the codebase.

```
DELETE integrations/intouch-pay/intouch-pay.service.ts
DELETE integrations/intouch-pay/intouch-pay.service.spec.ts
DELETE integrations/intouch-pay/intouch-pay.module.ts
DELETE integrations/intouch-pay/          (the folder is now empty — D3 moved the rest)
DELETE payments/providers/intouch-pay.provider.ts
DELETE payments/providers/intouch-pay.provider.spec.ts
```

- `payments.module.ts` — drop `IntouchPayModule` and `IntouchPayProvider`.
- `payment-gateway.service.ts` — drop the `intouch: IntouchPayProvider` constructor parameter and its `register()` call. Everything else stays; the map, the resolution order and the `canCharge()` semantics are unchanged.
- `payment-gateway.service.spec.ts` — rewrite. Fourteen assertions name IntouchPay; the *behaviours* they cover (unknown method, inactive method, unconfigured provider, sort-order selection, `canCharge` false when nothing is active) all still matter. Re-express them with a second **fake** provider rather than deleting the cases — a router with one provider that is never tested against a second is a router that quietly stops routing.
- `payments-public.controller.ts` — delete the `provider !== IREMBOPAY → 'intouchpay'` branch at L67. With one provider, a resolved provider always means widget + push; an unresolved one already returns the null/manual-fallback object.
- `webhooks.controller.ts` — **delete `POST /webhooks/intouch-pay` entirely** (L70–133) and the `PaymentSettingsService` injection it needed. Update the file header, which still says "Public webhook endpoints called by IntouchPay".
- `good-conduct-webhook.service.ts:80` — change the applicant-visible string to *"Payment confirmed — request submitted"*. Provider names do not belong in an applicant's history.
- Comment sweep, `intouchpay`-scoped only: `payment-gateway.port.ts` (L9, L56, L59), `payment-transaction.entity.ts` (L30, L35, L39, L104), `donation.entity.ts:80`, `donation-webhook.service.ts` (L9, L15), the two reconciliation services, `marriage.controller.ts:62`, `marriage-admin.controller.ts:128,139`, `good-conduct.controller.ts:85`, `irembopay-reconciliation.service.ts:10`, `irembo-pay.types.ts:4`.
- Frontend comment sweep: `CartDrawer.tsx` (L345, 407, 462, 517), `MarriageWizard.tsx:536`, `admin/marriage/[id]/page.tsx:1163`, `PaymentMethodSettingsTab.tsx:363–368` (delete the "How IntouchPay works" block), the two icon/gradient maps.

Leave `irembo-pay-webhook.service.ts`'s IntouchPay-shaped payload translation **alone** for now — it is load-bearing for all three domain handlers. §5.2 covers retiring it properly.

**Verify:** `npm run lint && npm run build && npm test` in both apps; `grep -rniE "intouchpay|MOMO_INTOUCH|intouch-pay" apps/*/src` returns only the deliberate archival keeps (the deprecated enum member, the legacy `PaymentOperation` literals, the retired `METHOD_LABELS` entry, historical migrations).

---

### Phase D7 — Database retirement (½ day)

**Goal:** stop new rows defaulting to a provider that no longer exists, without touching a single historical row.

New migration `1790000000067-063-retire-intouchpay.ts`:

```sql
-- 1. Deactivate the method. NEVER DELETE THE ROW — payment_transactions
--    rows reference this code and admin reporting joins on it.
UPDATE payment_methods
   SET is_active = false,
       name = 'Mobile Money (IntouchPay — retired)',
       description = 'Retired 2026-08. Historical transactions only.'
 WHERE code = 'MOMO_INTOUCH';

-- 2. Clear the stored credentials. The gateway is gone; a live secret sitting
--    in a jsonb blob is a liability with no upside.
UPDATE payment_method_settings
   SET settings = '{}'::jsonb, is_configured = false
 WHERE payment_method_id = (SELECT id FROM payment_methods WHERE code = 'MOMO_INTOUCH');

-- 3. New rows should default to the surviving provider.
ALTER TABLE payment_transactions   ALTER COLUMN provider SET DEFAULT 'irembopay';
ALTER TABLE payment_provider_events ALTER COLUMN provider SET DEFAULT 'irembopay';
```

`down()` restores the defaults and reactivates the method — but **cannot restore the cleared credentials**, and must say so in a comment. That is the intended asymmetry: after D7, rolling back to IntouchPay means an admin re-enters the keys through the settings UI. Do not attempt to preserve them "just in case"; a rollback that needs 30 seconds of typing is fine, and a forgotten live secret in a jsonb column is not.

Also update the entity column defaults to match ([payment-transaction.entity.ts:62](apps/backend/src/payment-settings/entities/payment-transaction.entity.ts#L62), [payment-provider-event.entity.ts:32](apps/backend/src/integrations/intouch-pay/entities/payment-provider-event.entity.ts#L32) — at its new D3 path) so TypeORM's schema view and the database agree.

**Verify:**
```sql
SELECT count(*) FROM payment_transactions WHERE provider = 'intouchpay';  -- unchanged vs the D0 snapshot
SELECT is_active FROM payment_methods WHERE code = 'MOMO_INTOUCH';        -- false
```

**Done when:** the D0 snapshot counts are byte-identical and the method is inactive with empty settings.

---

### Phase D8 — Configuration and documentation cleanup (½ day)

1. `.env.example` — no IntouchPay **payment** variables exist there today (verified), but confirm no deploy manifest or CI secret store still injects `INTOUCHPAY_*`. **Leave `INTOUCH_USERNAME` / `INTOUCH_PASSWORD` / `INTOUCH_SENDER` / `INTOUCH_DLR_URL` untouched — those are IntouchSMS (§1.8).**
2. Rotate or revoke the IntouchPay merchant credentials with the provider, and notify them the integration is retired. A live partner password for an unused integration is an open door.
3. Remove the IntouchPay callback URL from the IntouchPay merchant portal so a stray retry hits nothing rather than a 404-and-retry loop.
4. Mark the IntouchPay onboarding checklist (the callback-ack + deposit-test items) as **withdrawn**, not merely incomplete — the deposit test is the `autoTriggerTestDeposit` flow deleted in D5, and leaving it "pending" invites someone to re-implement it.
5. Update `docs/irembopay-integration-plan.md` §4.8 and `docs/irembopay-phased-implementation-plan.md`, both of which state "IntouchPay stays as fallback behind the same port". After D6 that is no longer true; add a header note pointing at this document.
6. Delete `apps/backend/dist_bak_root/` if it is still a stale build artifact — it contains compiled IntouchPay declarations and pollutes every future grep.

---

## 4. Rollback

| Phase | Rollback | Cost |
| --- | --- | --- |
| D1–D2 | Flip the two `is_active` toggles | Seconds, no deploy |
| D3–D4 | `git revert` + deploy | Minutes |
| D5–D6 | `git revert` + deploy; IntouchPay credentials still in the DB | Minutes |
| D7 | Revert the migration + re-enter credentials in the settings UI | ~30 min, manual |
| D8 | Credentials revoked at the provider — re-onboarding required | Days |

**The point of no return is D8 step 2** (revoking the merchant credentials). Everything before it is recoverable within a deploy cycle. Do not run D8 until D1–D7 have been live in production for at least a full settlement cycle.

---

## 5. Follow-ups deliberately out of scope

### 5.1 Provider-neutral webhook telemetry

`PaymentEventsService` emits `provider: 'intouchpay'` hardcoded. D3 parameterises it; making the admin SSE consumers *display* the provider is a separate small UI change.

### 5.2 Retiring the IntouchPay-shaped payload

[irembo-pay-webhook.service.ts:151](apps/backend/src/webhooks/irembo-pay-webhook.service.ts#L151) synthesises `{ requesttransactionid, responsecode: '01', status: 'Successfull' }` — including the provider's original typo — purely so the three domain webhook services can stay shared. Once IntouchPay is gone this is a fossil shape carried for no reason. Replacing it means changing `MarriageWebhookService`, `DonationWebhookService` and `GoodConductWebhookService` to accept a neutral `PaymentSettledEvent`. **Worth doing, but not during a payment migration** — it touches the exact code path that credits money, and it should land as its own change with its own tests.

### 5.3 The `DON-` / `MAR-` / `GC-` transaction-id prefixes

These are IntouchPay-era conventions the domain handlers match on. They work fine and are not worth churning; they just should not be described as "IntouchPay's format" in comments after D6.

---

## 6. Effort

| Phase | Work | Est. |
| --- | --- | --- |
| D0 | Pre-flight, product mapping audit, decision on §2.3 | 0.5 d |
| D1 | Settings cutover | 0.5 d |
| D2 | Soak | 5–10 d calendar, ~0 d effort |
| D3 | Relocate shared infrastructure | 1 d |
| D4 | Port the status-polling paths | 1 d |
| D5 | Rebuild the admin test harness | 1 d |
| D6 | Delete provider, module, unsigned webhook; comment sweep | 1 d |
| D7 | Retirement migration | 0.5 d |
| D8 | Config, credential revocation, docs | 0.5 d |
| | **Engineering total** | **≈ 6 days** + soak |

---

## 7. Definition of done

- [ ] `grep -rniE "intouchpay|intouch-pay|MOMO_INTOUCH" apps/*/src` returns only: the deprecated `PaymentMethodCode.MOMO_INTOUCH` member, the legacy `PaymentOperation` literals, the retired `METHOD_LABELS` entry, and historical migrations.
- [ ] `grep -rn "intouchsms\|INTOUCH_USERNAME" apps/backend/src` still returns the SMS integration, **unchanged**, and a test SMS delivers.
- [ ] `POST /api/v1/webhooks/intouch-pay` returns 404.
- [ ] Donations, marriage and good conduct each complete a full payment end-to-end on IremboPay: MoMo push, card via widget, and payment link.
- [ ] Each of the three waiting screens correctly reports SUCCESSFUL / FAILED / PENDING through `PaymentGatewayService.getStatus()`.
- [ ] The reconciliation cron recovers a deliberately dropped IremboPay callback.
- [ ] Historical IntouchPay transactions still render in the admin transactions list with their method name.
- [ ] `payment_transactions` and `payment_provider_events` row counts for `provider = 'intouchpay'` match the D0 snapshot exactly.
- [ ] `PaymentGatewayService` still routes through the port with a second (fake) provider registered — the abstraction outlives the provider it was built for.
- [ ] IntouchPay merchant credentials revoked; the callback URL removed from their portal.
