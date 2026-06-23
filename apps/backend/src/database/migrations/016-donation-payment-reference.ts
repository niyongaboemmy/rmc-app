import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the fields a real payment-gateway lifecycle needs on the `donations`
 * table:
 *   - `payment_reference` — the gateway's transaction reference (e.g. the MoMo
 *     requestToPay reference id) used to poll/confirm the payment status.
 *   - `donor_phone` — the payer's mobile number, required to initiate a Mobile
 *     Money collection and useful for reconciliation.
 *
 * Donations paid through a configured gateway now start as 'pending' and are
 * moved to 'completed'/'failed' once the gateway confirms the transaction.
 */
export class DonationPaymentReference1781957702482 implements MigrationInterface {
  name = 'DonationPaymentReference1781957702482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
        ADD COLUMN IF NOT EXISTS "payment_reference" varchar(100),
        ADD COLUMN IF NOT EXISTS "donor_phone" varchar(20)
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_donations_payment_reference" ON "donations" ("payment_reference")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_payment_reference"`);
    await queryRunner.query(`
      ALTER TABLE "donations"
        DROP COLUMN IF EXISTS "donor_phone",
        DROP COLUMN IF EXISTS "payment_reference"
    `);
  }
}
