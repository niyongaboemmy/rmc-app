import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Monitoring log for payment-provider (IntouchPay) request attempts. One row
 * per attempt records latency and outcome (success/timeout/error) so we can
 * track how often the provider is slow or unavailable.
 */
export class PaymentProviderEvents1786200000037 implements MigrationInterface {
  name = 'PaymentProviderEvents1786200000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_provider_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" varchar(30) NOT NULL DEFAULT 'intouchpay',
        "operation" varchar(40) NOT NULL,
        "outcome" varchar(20) NOT NULL,
        "simulated" boolean NOT NULL DEFAULT false,
        "latency_ms" integer NOT NULL,
        "slow" boolean NOT NULL DEFAULT false,
        "attempt" integer NOT NULL DEFAULT 1,
        "response_code" varchar(30),
        "request_transaction_id" varchar(200),
        "detail" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_provider_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_event_operation" ON "payment_provider_events" ("operation")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_event_outcome" ON "payment_provider_events" ("outcome")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_event_created_at" ON "payment_provider_events" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_provider_events"`);
  }
}
