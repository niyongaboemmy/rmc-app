#!/usr/bin/env python3
"""
Applies the IremboPay edits that could not be made because the target files are
owned by root.

Run after fixing ownership:

    sudo chown -R "$(whoami)" /Users/m2pro/dev/projects/rmc-app
    python3 scripts/apply-irembopay-pending-edits.py

Idempotent: each edit checks whether it is already applied and skips if so.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BE = ROOT / "apps" / "backend" / "src"
FE = ROOT / "apps" / "frontend" / "src"

failures = []
applied = []
skipped = []


def edit(path: Path, marker: str, old: str, new: str, label: str) -> None:
    """Replaces `old` with `new` unless `marker` is already present."""
    if not path.exists():
        failures.append(f"{label}: {path} does not exist")
        return
    text = path.read_text()
    if marker in text:
        skipped.append(f"{label} (already applied)")
        return
    if old not in text:
        failures.append(f"{label}: anchor text not found in {path}")
        return
    try:
        path.write_text(text.replace(old, new, 1))
    except PermissionError:
        failures.append(f"{label}: permission denied writing {path} — run the chown first")
        return
    applied.append(label)


# ── 1. Phase 5 — capture the raw request body for the webhook HMAC ────────────
#
# The signature covers the exact bytes received. `json()` discards them, so
# without this hook every IremboPay signature check fails. Scoped to the webhook
# path so a 2 MB buffer is not retained on every request.
edit(
    BE / "main.ts",
    marker="rawBody",
    old="  app.use(json({ limit: '2mb' }));",
    new="""  /**
   * IremboPay signs its webhooks over the RAW request bytes. Re-serialising the
   * parsed object cannot reproduce them — key order, whitespace and number
   * formatting all differ from the wire — so the buffer is captured here, before
   * the parser discards it. Scoped to the webhook path: retaining a 2 MB buffer
   * on every request would be a memory cost for nothing.
   */
  app.use(
    json({
      limit: '2mb',
      verify: (req: IncomingMessage & { rawBody?: Buffer }, _res, buf: Buffer) => {
        if ((req as { originalUrl?: string }).originalUrl?.includes('/webhooks/irembopay')) {
          req.rawBody = Buffer.from(buf);
        }
      },
    }),
  );""",
    label="Phase 5 — main.ts raw body capture",
)

edit(
    BE / "main.ts",
    marker="import { IncomingMessage }",
    old="import { json, urlencoded } from 'express';",
    new="import { json, urlencoded } from 'express';\nimport { IncomingMessage } from 'http';",
    label="Phase 5 — main.ts IncomingMessage import",
)

# ── 2. Phase 3 — widen the shared telemetry operation union ───────────────────
edit(
    BE / "integrations" / "intouch-pay" / "entities" / "payment-provider-event.entity.ts",
    marker="create_invoice",
    old=(
        "export type PaymentOperation = 'request_payment' | 'get_status' | "
        "'get_balance' | 'deposit';"
    ),
    new="""export type PaymentOperation =
  // IntouchPay
  | 'request_payment'
  | 'get_status'
  | 'get_balance'
  | 'deposit'
  // IremboPay
  | 'create_invoice'
  | 'get_invoice'
  | 'initiate_push'
  | 'update_invoice';""",
    label="Phase 3 — PaymentOperation union widened",
)

# Drop the cast the client needed while the union was IntouchPay-only.
edit(
    BE / "integrations" / "irembo-pay" / "irembo-pay.client.ts",
    marker="operation,\n          outcome,",
    old="""          // The union in the shared entity is IntouchPay-shaped; IremboPay's
          // operations are additional values in the same varchar column.
          operation: operation as never,
          outcome,""",
    new="""          operation,
          outcome,""",
    label="Phase 3 — drop the operation cast in the client",
)

# ── 3. Phase 6 — IremboPay icon in the credentials tab ────────────────────────
edit(
    FE / "app" / "[locale]" / "admin" / "settings" / "_components" / "payment"
       / "PaymentMethodSettingsTab.tsx",
    marker="IREMBOPAY:",
    old="  MOMO_INTOUCH:  Smartphone,",
    new="  MOMO_INTOUCH:  Smartphone,\n  IREMBOPAY:     Globe,",
    label="Phase 6 — PaymentMethodSettingsTab icon map",
)

_tab = (
    FE / "app" / "[locale]" / "admin" / "settings" / "_components" / "payment"
       / "PaymentMethodSettingsTab.tsx"
)
if _tab.exists():
    _text = _tab.read_text()
    if "Globe," not in _text.split("from 'lucide-react'")[0]:
        # The icon import list varies; add Globe to whichever lucide import exists.
        import re

        _new = re.sub(
            r"(import \{\s*)([^}]*?)(\} from 'lucide-react';)",
            lambda m: m.group(1) + m.group(2).rstrip().rstrip(",") + ", Globe,\n" + m.group(3),
            _text,
            count=1,
        )
        if _new != _text:
            try:
                _tab.write_text(_new)
                applied.append("Phase 6 — PaymentMethodSettingsTab Globe import")
            except PermissionError:
                failures.append("Phase 6 — Globe import: permission denied")
        else:
            failures.append("Phase 6 — Globe import: could not locate the lucide import")

# ── 4. Phase 8.1 — route donations through the gateway port ───────────────────
edit(
    BE / "donations" / "donations.service.ts",
    marker="PaymentGatewayService",
    old="""      const result = await this.intouchPay.requestPayment({
        username: creds.username,
        partnerPassword: creds.partnerPassword,
        accountNo: creds.accountNo,
        amount: Number(saved.amount),
        mobilePhone: dto.donorPhone as string,
        transactionId: requestTxnId,
        reason: 'RMC Donation – Rwanda Muslim Council',
        callbackUrl: creds.callbackUrl || fallbackCallback,
        gatewayUrl: creds.gatewayUrl || undefined,
      });

      // Store requestTxnId and gateway txnId separated by | for status polling
      saved.paymentReference = result.transactionId
        ? `${requestTxnId}|${result.transactionId}`
        : requestTxnId;""",
    new="""      // Routed through the gateway port rather than a hardwired provider, so
      // switching to IremboPay is a settings change rather than a deploy. The
      // `DON-` prefix is preserved either way — the webhook services match on it.
      const result = await this.paymentGateway.charge({
        transactionId: requestTxnId,
        amount: Number(saved.amount),
        currency: saved.currency,
        paymentTypeKey: 'DONATION',
        referenceId: saved.id,
        payer: {
          name: saved.donorName ?? undefined,
          phone: dto.donorPhone as string,
          email: saved.donorEmail ?? undefined,
        },
        description: 'RMC Donation – Rwanda Muslim Council',
        pushProvider: 'MTN',
      });

      // `providerReference` already carries the format each provider's webhook
      // matching expects — `requestTxnId|gatewayTxnId` for IntouchPay, the
      // invoice number for IremboPay.
      saved.paymentReference = result.providerReference || requestTxnId;""",
    label="Phase 8.1 — donations charge via PaymentGatewayService",
)

# `fallbackCallback` was only ever an IntouchPay argument; the gateway resolves
# its own callback URL from settings, so the local would now be unused.
edit(
    BE / "donations" / "donations.service.ts",
    marker="// callback URL is resolved by the gateway",
    old=(
        "      const fallbackCallback = `${this.configService.get('app.url', "
        "'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;\n"
    ),
    new="      // callback URL is resolved by the gateway from the provider's settings\n",
    label="Phase 8.1 — drop the now-unused fallback callback local",
)

# The gateway is injected alongside IntouchPayService rather than replacing it:
# `refreshPaymentStatus` still calls IntouchPay directly, and Phase 8 is meant to
# be reversible by a settings change, not by a redeploy.
edit(
    BE / "donations" / "donations.service.ts",
    marker="private readonly paymentGateway",
    old="""    private readonly intouchPay: IntouchPayService,
    private readonly paymentSettings: PaymentSettingsService,""",
    new="""    private readonly intouchPay: IntouchPayService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly paymentSettings: PaymentSettingsService,""",
    label="Phase 8.1 — inject PaymentGatewayService",
)

edit(
    BE / "donations" / "donations.service.ts",
    marker="payments/payment-gateway.service",
    old="import { PaymentSettingsService } from '../payment-settings/payment-settings.service';",
    new=(
        "import { PaymentSettingsService } from '../payment-settings/payment-settings.service';\n"
        "import { PaymentGatewayService } from '../payments/payment-gateway.service';"
    ),
    label="Phase 8.1 — import PaymentGatewayService",
)

edit(
    BE / "donations" / "donations.module.ts",
    marker="PaymentsModule",
    old="import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';",
    new=(
        "import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';\n"
        "import { PaymentsModule } from '../payments/payments.module';"
    ),
    label="Phase 8.1 — donations.module imports PaymentsModule",
)

edit(
    BE / "donations" / "donations.module.ts",
    marker="PaymentsModule,",
    old="    PaymentSettingsModule,",
    new="    PaymentSettingsModule,\n    PaymentsModule,",
    label="Phase 8.1 — register PaymentsModule in donations imports",
)

print()
for item in applied:
    print(f"  applied  {item}")
for item in skipped:
    print(f"  skipped  {item}")
for item in failures:
    print(f"  FAILED   {item}")
print()

if failures:
    print("Some edits did not apply. Fix the causes above and re-run — this script is idempotent.")
    sys.exit(1)

print("All pending edits applied. Now run:")
print("  cd apps/backend  && npx tsc --noEmit -p tsconfig.json && npm test")
print("  cd apps/frontend && npx tsc --noEmit -p tsconfig.json && npm run build")
