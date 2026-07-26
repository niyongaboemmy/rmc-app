import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

/**
 * Adds an unguessable tracking code to tender bids. The public OTP-gated status
 * lookup previously resolved by applicationNumber, which is sequential and so
 * enumerable — a guessed number could trigger an OTP SMS to its owner. This
 * random code (32^8 ≈ 1.1e12 combinations) closes that: the tracker resolves by
 * trackingCode only.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

function generateTrackingCode(now = new Date()): string {
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31];
  return `RMC-TND-${yymm}-${suffix}`;
}

export class TenderTrackingCode1790000000052 implements MigrationInterface {
  name = 'TenderTrackingCode1790000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tender_applications" ADD COLUMN IF NOT EXISTS "tracking_code" varchar(40)`,
    );

    // Backfill every existing bid with a unique random code.
    const rows: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tender_applications WHERE tracking_code IS NULL`,
    );
    const used = new Set<string>();
    for (const r of rows) {
      let code = generateTrackingCode();
      while (used.has(code)) code = generateTrackingCode();
      used.add(code);
      await queryRunner.query(`UPDATE tender_applications SET tracking_code = $1 WHERE id = $2`, [
        code,
        r.id,
      ]);
    }

    await queryRunner.query(
      `ALTER TABLE "tender_applications" ALTER COLUMN "tracking_code" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tender_app_tracking_code" ON "tender_applications" ("tracking_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tender_app_tracking_code"`);
    await queryRunner.query(`ALTER TABLE "tender_applications" DROP COLUMN IF EXISTS "tracking_code"`);
  }
}
