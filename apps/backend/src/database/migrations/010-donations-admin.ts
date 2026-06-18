import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `donations` table (created in 001-initial-schema) with the fields
 * the public donate form collects for guest donors and the admin report needs:
 * donor identity (for non-registered donors), the chosen payment method, and a
 * lifecycle status. Status lives on the donation itself so the admin report is a
 * single self-contained source of truth (the `transactions` table is reserved
 * for a future real payment-gateway integration).
 */
export class DonationsAdmin1700000000010 implements MigrationInterface {
  name = 'DonationsAdmin1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
        ADD COLUMN IF NOT EXISTS "donor_name" varchar(150),
        ADD COLUMN IF NOT EXISTS "donor_email" varchar(150),
        ADD COLUMN IF NOT EXISTS "payment_method" varchar(20),
        ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_donations_status" ON "donations" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_donations_donated_at" ON "donations" ("donated_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_donated_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_status"`);
    await queryRunner.query(`
      ALTER TABLE "donations"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "payment_method",
        DROP COLUMN IF EXISTS "donor_email",
        DROP COLUMN IF EXISTS "donor_name"
    `);
  }
}
