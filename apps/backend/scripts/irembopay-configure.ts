/**
 * One-shot bootstrap: moves IremboPay credentials from your gitignored `.env`
 * into `payment_method_settings`, activates the method, and maps a product code
 * to every payment type that has none.
 *
 * This exists so a fresh environment can be configured without clicking through
 * the settings UI — not as a second source of truth. The application still reads
 * everything from the database at runtime, so after this runs an admin can
 * rotate keys or flip sandbox→production from the UI with no redeploy.
 *
 * Nothing here is written to a tracked file. Populate a gitignored `.env`:
 *
 *   IREMBOPAY_SECRET_KEY=...      # Portal → Integration Details → View Token
 *   IREMBOPAY_PUBLIC_KEY=...
 *   IREMBOPAY_ACCOUNT_RWF=RMC_RWF # Portal → Payment Accounts (sandbox: RMC-RWF)
 *   IREMBOPAY_ACCOUNT_USD=RMC_USD # optional
 *   IREMBOPAY_ACCOUNT_EUR=RMC_EUR # optional
 *   IREMBOPAY_PRODUCT_CODE=PC-... # sandbox catch-all only; production products
 *                                 # come from the 10-irembopay-catalog seed
 *   IREMBOPAY_API_BASE=           # optional; empty derives from test mode
 *
 * Run:  npx ts-node scripts/irembopay-configure.ts [--activate] [--production]
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';
import { PaymentSettingsService } from '../src/payment-settings/payment-settings.service';
import { ProviderProductsService } from '../src/payment-settings/provider-products.service';
import { PaymentMethodCode } from '../src/payment-settings/entities/payment-method.entity';
import { IREMBOPAY_PROVIDER_KEY } from '../src/payments/providers/irembo-pay.provider';
import { IREMBOPAY_FIELD_KEYS } from '../src/payment-settings/irembopay-fields';

dotenv.config();

/** Shows enough of a key to confirm which one is loaded, never enough to use it. */
function fingerprint(value: string): string {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
}

async function main(): Promise<void> {
  const secretKey = (process.env.IREMBOPAY_SECRET_KEY ?? '').trim();
  const publicKey = (process.env.IREMBOPAY_PUBLIC_KEY ?? '').trim();
  const account = (process.env.IREMBOPAY_ACCOUNT_RWF || process.env.IREMBOPAY_ACCOUNT || '').trim();
  const accountUsd = (process.env.IREMBOPAY_ACCOUNT_USD ?? '').trim();
  const accountEur = (process.env.IREMBOPAY_ACCOUNT_EUR ?? '').trim();
  const productCode = (process.env.IREMBOPAY_PRODUCT_CODE ?? '').trim();
  const apiBaseUrl = (process.env.IREMBOPAY_API_BASE ?? '').trim();

  const missing = Object.entries({
    IREMBOPAY_SECRET_KEY: secretKey,
    IREMBOPAY_PUBLIC_KEY: publicKey,
    IREMBOPAY_ACCOUNT_RWF: account,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(
      `\nMissing ${missing.join(', ')}.\n` +
        `Copy the block from .env.example into a gitignored .env and fill it from the IremboPay portal.\n`,
    );
    process.exit(1);
  }

  const activate = process.argv.includes('--activate');
  const production = process.argv.includes('--production');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const settings = app.get(PaymentSettingsService);
  const products = app.get(ProviderProductsService);

  const method = await settings.findMethodByCode(PaymentMethodCode.IREMBOPAY);
  if (!method) {
    console.error('\nNo IREMBOPAY payment method row. Run the migrations first.\n');
    await app.close();
    process.exit(1);
  }

  console.log(`\nsecret key   ${fingerprint(secretKey)}`);
  console.log(`public key   ${fingerprint(publicKey)}`);
  console.log(`accounts     RWF=${account} USD=${accountUsd || '-'} EUR=${accountEur || '-'}`);
  console.log(`mode         ${production ? 'PRODUCTION' : 'sandbox'}`);

  // Into the fields of the merchant being configured; the other merchant's
  // values on the row are left alone (see payment-settings/irembopay-fields.ts).
  const f = IREMBOPAY_FIELD_KEYS[production ? 'production' : 'sandbox'];
  await settings.upsertMethodSettings(method.id, {
    settings: {
      [f.secretKey]: secretKey,
      [f.publicKey]: publicKey,
      [f.accountRwf]: account,
      ...(accountUsd ? { [f.accountUsd]: accountUsd } : {}),
      ...(accountEur ? { [f.accountEur]: accountEur } : {}),
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
    },
    isTestMode: !production,
  });
  console.log('\n✓ credentials saved to payment_method_settings');

  if (productCode && production) {
    console.log(
      '· IREMBOPAY_PRODUCT_CODE ignored in production — run the seeds, whose\n' +
        '  10-irembopay-catalog maps every production product per currency',
    );
  } else if (productCode) {
    const rows = await products.listRows(IREMBOPAY_PROVIDER_KEY, 'sandbox');
    const unmapped = rows.filter(
      (r) => r.paymentTypeRateId === null && r.currency === 'RWF' && !r.productCode,
    );
    for (const row of unmapped) {
      await products.upsert(IREMBOPAY_PROVIDER_KEY, {
        paymentTypeId: row.paymentTypeId,
        productCode,
        currency: 'RWF',
        environment: 'sandbox',
      });
    }
    console.log(
      unmapped.length > 0
        ? `✓ mapped ${unmapped.length} payment type(s) to ${productCode}`
        : '· every payment type already has a product mapping',
    );
    console.log(
      '  (one product for everything is fine to start; give each type its own\n' +
        '   code in the Products tab when you want per-service reporting)',
    );
  } else {
    console.log('· IREMBOPAY_PRODUCT_CODE not set — map products in the Products tab');
  }

  if (activate) {
    if (!method.isActive) await settings.toggleMethodActive(method.id);
    console.log('✓ IremboPay activated — it is now the gateway for new charges');
    console.log('  IntouchPay stays configured; switch back by toggling in the settings UI.');
  } else {
    console.log('\n· left INACTIVE. Re-run with --activate, or flip it in the settings UI.');
  }

  console.log(
    `\nNext: set the portal callback URL to\n` +
      `  ${process.env.APP_URL ?? 'https://<api-host>'}/api/v1/webhooks/irembopay\n` +
      `then verify with:  npx ts-node scripts/irembopay-sandbox-smoke.ts\n`,
  );

  await app.close();
}

void main().catch((err) => {
  // Never echo the credential itself, only what went wrong.
  console.error(`Configuration failed: ${(err as Error).message}`);
  process.exit(1);
});
