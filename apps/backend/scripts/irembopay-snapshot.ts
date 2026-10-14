/**
 * Snapshots the IremboPay configuration — the settings row (keys included) and
 * every product mapping — to a local JSON file, before a cutover changes them.
 *
 * The file holds the secret key, so:
 *   - it is written to `apps/backend/backups/`, which is gitignored;
 *   - it is created with mode 0600;
 *   - stdout shows key fingerprints only.
 * Move it into the password manager entry and delete it from the machine.
 *
 * Run:  npx ts-node scripts/irembopay-snapshot.ts
 *  (on the server, compiled: node dist/scripts/irembopay-snapshot.js)
 *
 * Restoring is deliberately manual (the seed with IREMBOPAY_MODE and the keys
 * in .env — see docs/irembopay-sandbox-reference.md): a script that writes a
 * secret key back from a file is one mis-typed path from clobbering production.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../src/config/data-source';

dotenv.config();

function fingerprint(value: string | undefined): string {
  if (!value) return '(none)';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 7)}…${value.slice(-2)} (${value.length} chars)`;
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const [settings] = await AppDataSource.query(
      `SELECT m.code, m.is_active, s.is_test_mode, s.is_configured, s.settings, s.updated_at
         FROM payment_methods m
         LEFT JOIN payment_method_settings s ON s.payment_method_id = m.id
        WHERE m.code = 'IREMBOPAY'`,
    );
    if (!settings) {
      console.error('No IREMBOPAY payment method row. Nothing to snapshot.');
      process.exitCode = 1;
      return;
    }

    const mappings = await AppDataSource.query(
      `SELECT pt.key AS payment_type_key, r.code AS rate_code, p.*
         FROM payment_type_provider_products p
         JOIN payment_types pt ON pt.id = p.payment_type_id
         LEFT JOIN payment_type_rates r ON r.id = p.payment_type_rate_id
        WHERE p.provider = 'irembopay'
        ORDER BY pt.key, p.payment_type_rate_id NULLS FIRST`,
    );

    const environment = settings.is_test_mode === false ? 'production' : 'sandbox';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
    const dir = path.resolve(__dirname, '..', 'backups');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, `irembopay-${environment}-${stamp}.json`);

    fs.writeFileSync(
      file,
      JSON.stringify(
        { takenAt: new Date().toISOString(), environment, method: settings, mappings },
        null,
        2,
      ),
      { mode: 0o600 },
    );

    const s = (settings.settings ?? {}) as Record<string, string>;
    console.log(`\nSnapshot written: ${file}  (mode 0600)`);
    console.log(`  mode        ${environment} (active: ${settings.is_active})`);
    console.log(`  secret key  ${fingerprint(s.secretKey)}`);
    console.log(`  public key  ${fingerprint(s.publicKey)}`);
    console.log(
      `  accounts    RWF=${s.paymentAccountIdentifier || '-'} USD=${s.paymentAccountIdentifierUsd || '-'} EUR=${s.paymentAccountIdentifierEur || '-'}`,
    );
    console.log(`  mappings    ${mappings.length}`);
    console.log(
      '\nIt contains the secret key. Store it in the password manager, then delete it here.\n',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((err) => {
  console.error(`Snapshot failed: ${(err as Error).message}`);
  process.exit(1);
});
