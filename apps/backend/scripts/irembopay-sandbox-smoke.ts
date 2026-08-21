/**
 * IremboPay sandbox smoke test.
 *
 * Answers the two questions the docs contradict themselves on — the MoMo phone
 * format and the initiate-payment verb — against the real sandbox, and proves
 * a 100 RWF invoice can be created end to end.
 *
 * Credentials come from the environment, never from this file:
 *
 *   IREMBOPAY_SECRET_KEY=...            # Portal → Integration Details → View Token
 *   IREMBOPAY_PRODUCT_CODE=PI-xxxxxxxx  # Portal → Products
 *   IREMBOPAY_ACCOUNT=TST-RWF           # Portal → Payment Accounts
 *   IREMBOPAY_API_BASE=https://api.sandbox.irembopay.com   # optional
 *   IREMBOPAY_TEST_MSISDN=0781234567                        # optional
 *
 * Run:  npx ts-node scripts/irembopay-sandbox-smoke.ts
 */
import * as dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.IREMBOPAY_SECRET_KEY ?? '';
const PRODUCT = process.env.IREMBOPAY_PRODUCT_CODE ?? '';
const ACCOUNT = process.env.IREMBOPAY_ACCOUNT ?? '';
const BASE = (process.env.IREMBOPAY_API_BASE ?? 'https://api.sandbox.irembopay.com').replace(
  /\/+$/,
  '',
);
const MSISDN = process.env.IREMBOPAY_TEST_MSISDN ?? '0781234567';

if (!SECRET || !PRODUCT || !ACCOUNT) {
  console.error(
    'Missing IREMBOPAY_SECRET_KEY / IREMBOPAY_PRODUCT_CODE / IREMBOPAY_ACCOUNT. ' +
      'Put them in a gitignored .env — never in a tracked file.',
  );
  process.exit(1);
}

function rfc3339(date: Date): string {
  const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
  );
}

async function call(method: string, path: string, body?: unknown, version = '3') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'irembopay-secretKey': SECRET,
      'X-API-Version': version,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

async function main() {
  const transactionId = `SMOKE-${Date.now()}`;

  console.log(`\n[1] POST /payments/invoices — 100 RWF, txn ${transactionId}`);
  const created = await call('POST', '/payments/invoices', {
    transactionId,
    paymentAccountIdentifier: ACCOUNT,
    paymentItems: [{ code: PRODUCT, quantity: 1, unitAmount: 100 }],
    expiryAt: rfc3339(new Date(Date.now() + 60 * 60 * 1000)),
    description: 'RMC sandbox smoke test',
    language: 'EN',
    customer: { name: 'Smoke Test', phoneNumber: MSISDN },
  });
  console.log(`    status=${created.status}`);
  console.log(`    ${JSON.stringify(created.json).slice(0, 500)}`);

  const data = created.json.data as Record<string, unknown> | undefined;
  const invoiceNumber = data?.invoiceNumber as string | undefined;
  if (!invoiceNumber) {
    console.error('\n✗ No invoiceNumber returned — stopping.');
    process.exit(1);
  }
  console.log(`    ✓ invoiceNumber=${invoiceNumber}  paymentLinkUrl=${data?.paymentLinkUrl}`);

  console.log(`\n[2] GET /payments/invoices/{transactionId} — recover by OUR key`);
  const byTxn = await call('GET', `/payments/invoices/${encodeURIComponent(transactionId)}`);
  console.log(
    `    status=${byTxn.status} → ${byTxn.status === 200 ? '✓ our transactionId works as a reference' : '✗'}`,
  );

  // ── Known unknown #1: MoMo phone format ────────────────────────────────────
  console.log(`\n[3] POST /payments/transactions/initiate — phone format probe`);
  const local = MSISDN.replace(/\D/g, '').replace(/^250/, '0');
  const international = `250${local.slice(1)}`;

  for (const [label, phone] of [
    ['local 07########', local],
    ['international 250########', international],
  ] as const) {
    const res = await call('POST', '/payments/transactions/initiate', {
      accountIdentifier: phone,
      paymentProvider: 'MTN',
      invoiceNumber,
    });
    const code = (res.json.errors as Array<{ code?: string }> | undefined)?.[0]?.code;
    console.log(`    ${label.padEnd(28)} → status=${res.status} ${code ? `code=${code}` : '✓'}`);
  }

  // ── Known unknown #2: the initiate verb ────────────────────────────────────
  console.log(`\n[4] GET /payments/transactions/initiate — verb probe (expect a 4xx/405)`);
  const asGet = await call('GET', '/payments/transactions/initiate');
  console.log(
    `    status=${asGet.status} → POST is ${asGet.status >= 400 ? 'confirmed correct' : 'ambiguous'}`,
  );

  console.log(
    `\nRecord the winning phone format in normalizeMsisdn() in irembo-pay.types.ts and pin it with a test.\n`,
  );
}

void main().catch((err) => {
  // Redacted by construction: we never print headers.
  console.error(`Smoke test failed: ${(err as Error).message}`);
  process.exit(1);
});
