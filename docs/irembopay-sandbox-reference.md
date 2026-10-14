# IremboPay — Sandbox Reference (archived 2026-10-14)

**Status:** Archived. Production cutover is planned in
[irembopay-production-cutover-plan.md](irembopay-production-cutover-plan.md).
Keep this file. It is how we rebuild a sandbox environment for local
development, staging, or a rollback rehearsal.

> **No secrets in this file.** The sandbox secret key, public key and portal
> login are in the team password manager under **"IremboPay — SANDBOX"**. A key
> committed to `docs/` would stay in git history permanently, even a sandbox key.
> See [§3](#3-restoring-a-sandbox-environment) for how to load them.

---

## 1. Environment

| Item | Value |
|---|---|
| API base (host stored in settings) | `https://api.sandbox.irembopay.com` |
| Effective payments base | `https://api.sandbox.irembopay.com/payments` |
| Widget script | `https://dashboard.sandbox.irembopay.com/assets/payment/inline.js` |
| Merchant portal | `https://dashboard.sandbox.irembopay.com/auth/login` |
| API version header | `X-API-Version: 3` |
| Auth header | `irembopay-secretKey: <sandbox secret>` |
| Key prefix | `pk_live_…` / `sk_live_…`. **The sandbox issues `_live_` keys too.** The prefix does not tell you the environment. |
| Callback URL registered | `https://api.rwandamuslim.org/api/v1/webhooks/irembopay` |

## 2. Merchant resources (sandbox)

| Resource | Value | Notes |
|---|---|---|
| Payment account identifier | `RMC-RWF` | **Hyphen.** Production uses an underscore (`RMC_RWF`). |
| Product code (catch-all) | `PC-62d7108dd9` | The 09 seed mapped this one code to all 11 payment types. |
| USD / EUR accounts | none | The sandbox only ever invoiced in RWF. |

### Test instruments (from the IremboPay "Testing" page)

| Channel | Success | Failure |
|---|---|---|
| MTN MoMo | `0781234567` | `0780123456` |
| Airtel Money | `0731234567` | `0730123456` |
| Visa | `4242 4242 4242 4242`, any future expiry, CVV `123` | — |
| Mastercard | `5555 5555 5555 4444`, any future expiry, CVV `123` | `5198 9602 2985 7244` |
| Amex | `3782 822463 10005`, any future expiry, CVV `1234` | — |

## 3. Restoring a sandbox environment

**On an environment past migration 082** (production included) the sandbox keys
and account are stored in the *Sandbox merchant* fields of Admin → Settings →
Payments → IremboPay. Restoring sandbox there is just **Test mode on → Save**.
The steps below are for a fresh environment, or one whose sandbox fields were
cleared.

1. Pull the sandbox keys from the password manager into the gitignored
   `apps/backend/.env`:

   ```dotenv
   IREMBOPAY_MODE=sandbox
   IREMBOPAY_SECRET_KEY=<from password manager>
   IREMBOPAY_PUBLIC_KEY=<from password manager>
   IREMBOPAY_ACCOUNT_RWF=RMC-RWF
   ```

   With `IREMBOPAY_MODE=sandbox`, the keys go into the sandbox fields
   (`sandboxSecretKey`, …) and the production fields are left alone.

2. `npm run seed --workspace apps/backend` (or `node dist/database/seeds/run-seeds.js`).
   Seed 09 writes the settings row in test mode. Seed 10 gives any type without
   a sandbox mapping the catch-all `PC-62d7108dd9`.
3. Smoke test: `npx ts-node apps/backend/scripts/irembopay-sandbox-smoke.ts`.

The sandbox product mappings stay in
`payment_type_provider_products` next to the production ones (`environment =
'sandbox'`), and turning **Test mode** on in Admin → Settings → Payments selects
them again. Nothing has to be re-seeded to go back to sandbox except the keys.

## 4. Lessons from the sandbox phase (keep these in mind)

- The mode comes **only** from `IREMBOPAY_MODE` or the admin Test-mode toggle,
  never from the key prefix (commit `6d6d0fe`).
- `is_active` gates **new charges only**. Webhooks and reconciliation must keep
  working with the method deactivated, because that is how a rollback is done.
- Seed placeholders (`REPLACE_ME`, `<…>`) are treated as unset (commit `5afde0c`).
- The payment account fixes the invoice currency. A wrong account produces a
  wrong-currency invoice, and IremboPay returns no error for it.
