import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds gateway_response_code / gateway_message to donations so the real
 * IntouchPay response (e.g. "1005 — Failed Due to Insufficient Funds") is
 * persisted instead of collapsing to a bare "failed" status.
 */
export class DonationGatewayMessage1783964968100 implements MigrationInterface {
  name = 'DonationGatewayMessage1783964968100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
      ADD COLUMN IF NOT EXISTS "gateway_response_code" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "gateway_message" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
      DROP COLUMN IF EXISTS "gateway_response_code",
      DROP COLUMN IF EXISTS "gateway_message"
    `);
  }
}
