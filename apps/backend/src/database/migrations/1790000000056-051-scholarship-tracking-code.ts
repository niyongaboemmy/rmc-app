import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

/**
 * Adds an unguessable tracking code to scholarship applications.
 *
 * Scholarship was the last applicant-facing service still tracking by
 * `application_number`, which `generateApplicationNumber` builds as
 * `RMC-SCH-<district>-<YYYYMM>-<nextval(seq)>`. Everything but the counter is
 * guessable and the counter is a plain sequence, so the numbers enumerate: walk
 * 00001, 00002, … and you walk the applicant list. The lookup behind them was
 * `@Public()` and returned the whole entity, so that walk yielded national ID
 * numbers, dates of birth, and applicant and guardian phone numbers — for
 * secondary-school students.
 *
 * This is the same fix already applied to hajj (040), marriage (041) and tenders
 * (047): a crypto-random code (32^8 ≈ 1.1e12 combinations) that the OTP tracker
 * resolves by, instead of the sequential number.
 *
 * `application_number` stays. It is the human reference on correspondence and in
 * the admin console; it simply stops being a credential.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

function generateTrackingCode(now = new Date()): string {
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31]; // uniform: 256 is a multiple of 32
  return `RMC-SCH-${yymm}-${suffix}`;
}

export class ScholarshipTrackingCode1790000000056 implements MigrationInterface {
  name = 'ScholarshipTrackingCode1790000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" ADD COLUMN IF NOT EXISTS "tracking_code" varchar(40)`,
    );

    // Backfill every existing application with a unique random code. Generated
    // per row rather than from a sequence — that is the whole point.
    const rows: { id: string }[] = await queryRunner.query(
      `SELECT id FROM scholarship_applications WHERE tracking_code IS NULL`,
    );
    const used = new Set<string>();
    for (const r of rows) {
      let code = generateTrackingCode();
      while (used.has(code)) code = generateTrackingCode();
      used.add(code);
      await queryRunner.query(
        `UPDATE scholarship_applications SET tracking_code = $1 WHERE id = $2`,
        [code, r.id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" ALTER COLUMN "tracking_code" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_scholarship_app_tracking_code" ON "scholarship_applications" ("tracking_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_app_tracking_code"`);
    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" DROP COLUMN IF EXISTS "tracking_code"`,
    );
  }
}
