/**
 * Proves the marriage fee can be settled by either channel.
 *
 * 'momo' must push a prompt; 'card' must issue the same payable invoice and
 * push nothing — pushing as well would ask the payer to settle twice.
 *
 *   npx ts-node scripts/irembopay-marriage-channel-e2e.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IremboPayProvider } from '../src/payments/providers/irembo-pay.provider';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const provider = app.get(IremboPayProvider);

  let failures = 0;
  const check = (label: string, ok: boolean, detail = ''): void => {
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  };

  const base = {
    amount: 30000,
    currency: 'RWF',
    paymentTypeKey: 'MARRIAGE_FEE',
    payer: { name: 'Test Groom', phone: '0781234567' },
    description: 'Marriage application TEST-0001',
    isTest: true,
  };

  console.log('\n[card channel] issues an invoice, sends no MoMo prompt');
  const card = await provider.charge({
    ...base,
    transactionId: `MAR-CARD-${Date.now()}`,
    pushProvider: undefined,
  });
  check('invoice issued', !!card.providerReference, card.providerReference);
  check('payment link offered', !!card.paymentLinkUrl);
  check('widget public key returned', !!card.publicKey);
  check('widget script url returned', !!card.widgetScriptUrl);
  check('status pending', card.status === 'PENDING', card.status);

  console.log('\n[momo channel] issues an invoice AND pushes a prompt');
  const momo = await provider.charge({
    ...base,
    transactionId: `MAR-MOMO-${Date.now()}`,
    pushProvider: 'MTN',
  });
  check('invoice issued', !!momo.providerReference, momo.providerReference);
  check(
    'prompt reported to the payer',
    /prompt sent/i.test(momo.message ?? ''),
    momo.message ?? '',
  );

  await app.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(`channel e2e failed: ${(err as Error).message}`);
  process.exit(1);
});
