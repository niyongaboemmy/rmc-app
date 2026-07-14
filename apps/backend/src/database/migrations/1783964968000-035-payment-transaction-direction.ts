import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a `direction` column to payment_transactions so RequestDeposit (§3 —
 * sending money to a subscriber) test transactions can be distinguished from
 * RequestPayment (§2 — collecting money) ones in the same table.
 */
export class PaymentTransactionDirection1783964968000 implements MigrationInterface {
  name = 'PaymentTransactionDirection1783964968000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "direction" VARCHAR(20) NOT NULL DEFAULT 'collect'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "direction"
    `);
  }
}
