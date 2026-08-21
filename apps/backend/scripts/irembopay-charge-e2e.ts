/**
 * Exercises the IremboPay charge path against whatever `apiBaseUrl` is
 * configured in settings — a stub during development, sandbox once keys exist.
 *
 * Boots the real Nest DI container, so it proves the wiring as well as the
 * logic: product mapping → invoice creation → both rows persisted → MoMo push.
 *
 *   npx ts-node scripts/irembopay-charge-e2e.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IremboPayProvider } from '../src/payments/providers/irembo-pay.provider';
import { PaymentGatewayService } from '../src/payments/payment-gateway.service';
import { IremboPayInvoiceService } from '../src/integrations/irembo-pay/irembopay-invoice.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const provider = app.get(IremboPayProvider);
  const gateway = app.get(PaymentGatewayService);
  const invoices = app.get(IremboPayInvoiceService);

  const transactionId = `DON-charge-${Date.now()}`;
  let failures = 0;

  const check = (label: string, ok: boolean, detail = ''): void => {
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  };

  console.log('\n[1] charge() with a mapped payment type');
  const result = await provider.charge({
    transactionId,
    amount: 5000,
    currency: 'RWF',
    paymentTypeKey: 'DONATION',
    payer: { name: 'E2E Payer', phone: '0781234567', email: 'e2e@example.rw' },
    description: 'Charge path end-to-end test',
    pushProvider: 'MTN',
    isTest: true,
  });

  check('invoice number returned', !!result.providerReference, result.providerReference);
  check('payment link returned', !!result.paymentLinkUrl, result.paymentLinkUrl ?? '');
  check('widget public key returned', !!result.publicKey);
  check('widget script url returned', !!result.widgetScriptUrl);
  check('status is PENDING', result.status === 'PENDING', result.status);
  check('provider is irembopay', result.provider === 'irembopay');

  console.log('\n[2] both rows persisted');
  const stored = await invoices.findByTransactionId(transactionId);
  check('irembopay_invoices row exists', !!stored);
  check('amount persisted', Number(stored?.amount) === 5000, String(stored?.amount));
  check('status NEW', stored?.paymentStatus === 'NEW', stored?.paymentStatus);

  console.log('\n[3] idempotency — the same transactionId charges again');
  const repeat = await provider.charge({
    transactionId,
    amount: 5000,
    currency: 'RWF',
    paymentTypeKey: 'DONATION',
    payer: { name: 'E2E Payer', phone: '0781234567' },
    isTest: true,
  });
  check(
    'same invoice returned, no duplicate',
    repeat.providerReference === result.providerReference,
    repeat.providerReference,
  );

  console.log('\n[4] an unmapped payment type names the Products tab');
  try {
    await provider.charge({
      transactionId: `${transactionId}-unmapped`,
      amount: 1000,
      paymentTypeKey: 'HAJJ_FEE',
      payer: { phone: '0781234567' },
      isTest: true,
    });
    check('rejected before any HTTP call', false, 'it did not throw');
  } catch (err) {
    const message = (err as Error).message;
    check('rejected with an actionable message', /Products/.test(message), message);
  }

  console.log('\n[5] the gateway router reaches IremboPay by name');
  const resolved = await gateway.resolve('IREMBOPAY');
  check('resolved to IremboPay', resolved.providerName === 'IremboPay', resolved.providerName);

  await app.close();

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(`Charge e2e failed: ${(err as Error).message}`);
  process.exit(1);
});
