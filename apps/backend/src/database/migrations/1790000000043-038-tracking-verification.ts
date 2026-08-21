import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

// Crockford base32 (no I, L, O, U — avoids ambiguity when read aloud).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateCode(createdAt: Date): string {
  const d = new Date(createdAt);
  const yymm = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31]; // uniform: 256 is a multiple of 32
  return `RMC-JOB-${yymm}-${suffix}`;
}

export class TrackingVerification1790000000043 implements MigrationInterface {
  name = 'TrackingVerification1790000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add the unguessable public tracking code (nullable while we backfill).
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN "tracking_code" varchar(40)`);

    // 2) Backfill EVERY existing row with a random, unique code so nothing stays enumerable.
    const rows: { id: string; created_at: Date }[] = await queryRunner.query(
      `SELECT id, created_at FROM "job_applications"`,
    );
    const used = new Set<string>();
    for (const row of rows) {
      let code: string;
      do {
        code = generateCode(row.created_at);
      } while (used.has(code));
      used.add(code);
      await queryRunner.query(`UPDATE "job_applications" SET "tracking_code" = $1 WHERE "id" = $2`, [code, row.id]);
    }

    // 3) Enforce NOT NULL + uniqueness now that every row has a value.
    await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "tracking_code" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_job_applications_tracking_code" ON "job_applications" ("tracking_code")`,
    );

    // 4) OTP challenges for the public tracking flow.
    await queryRunner.query(`
      CREATE TABLE "tracking_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "phone" varchar(20) NOT NULL,
        "otp_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "attempts" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tracking_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tracking_verifications_application"
          FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tracking_verifications_application" ON "tracking_verifications" ("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tracking_verifications_expires" ON "tracking_verifications" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_verifications"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_applications_tracking_code"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "tracking_code"`);
  }
}
