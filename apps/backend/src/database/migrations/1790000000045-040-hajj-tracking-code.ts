import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateCode(createdAt: Date): string {
  const d = new Date(createdAt);
  const yymm = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31];
  return `RMC-HAJ-${yymm}-${suffix}`;
}

export class HajjTrackingCode1790000000045 implements MigrationInterface {
  name = 'HajjTrackingCode1790000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hajj_applications" ADD COLUMN "tracking_code" varchar(40)`);

    const rows: { id: string; created_at: Date }[] = await queryRunner.query(
      `SELECT id, created_at FROM "hajj_applications"`,
    );
    const used = new Set<string>();
    for (const row of rows) {
      let code: string;
      do {
        code = generateCode(row.created_at);
      } while (used.has(code));
      used.add(code);
      await queryRunner.query(`UPDATE "hajj_applications" SET "tracking_code" = $1 WHERE "id" = $2`, [code, row.id]);
    }

    await queryRunner.query(`ALTER TABLE "hajj_applications" ALTER COLUMN "tracking_code" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_hajj_applications_tracking_code" ON "hajj_applications" ("tracking_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hajj_applications_tracking_code"`);
    await queryRunner.query(`ALTER TABLE "hajj_applications" DROP COLUMN IF EXISTS "tracking_code"`);
  }
}
