import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the global payment_transactions table for tracking all IntouchPay
 * payment attempts (test payments and live payments from all service areas).
 */
export class PaymentTransactions1781957702486 implements MigrationInterface {
  name = 'PaymentTransactions1781957702486';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id"                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
        "request_transaction_id" VARCHAR(100) NOT NULL,
        "gateway_transaction_id" VARCHAR(200),
        "payment_method_code"    VARCHAR(50)  NOT NULL,
        "payment_type_key"       VARCHAR(50),
        "reference_id"           UUID,
        "amount"                 DECIMAL(12,2) NOT NULL,
        "currency"               VARCHAR(3)   NOT NULL DEFAULT 'RWF',
        "mobile_phone"           VARCHAR(30)  NOT NULL,
        "status"                 VARCHAR(20)  NOT NULL DEFAULT 'pending',
        "response_code"          VARCHAR(20),
        "message"                TEXT,
        "callback_payload"       JSONB,
        "is_test"                BOOLEAN      NOT NULL DEFAULT false,
        "initiated_by"           UUID,
        "completed_at"           TIMESTAMPTZ,
        "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ptx_request_txn_id" ON "payment_transactions" ("request_transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ptx_status"         ON "payment_transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ptx_reference_id"   ON "payment_transactions" ("reference_id")`,
    );

    // updated_at trigger (reuse existing function)
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_payment_transactions_updated_at" ON "payment_transactions";
      CREATE TRIGGER "trg_payment_transactions_updated_at"
      BEFORE UPDATE ON "payment_transactions"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions"`);
  }
}
