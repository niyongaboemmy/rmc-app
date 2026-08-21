import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IremboPay integration schema.
 *
 *  1. Seeds the IREMBOPAY payment method — inactive, so nothing changes until an
 *     admin configures and enables it.
 *  2. Adds multi-provider columns to the existing `payment_transactions` ledger.
 *     Existing rows keep `provider = 'intouchpay'` via the column default.
 *  3. Creates `irembopay_invoices`, a mirror of the provider-side invoice so
 *     reconciliation and the admin views never have to re-query the API.
 *  4. Creates `payment_type_provider_products`, the editable mapping from our
 *     payment types/rates to IremboPay product codes. Never hardcoded.
 *
 * `mobile_phone` loses its NOT NULL because card and bank payers have no MSISDN.
 */
export class IremboPayIntegration1790000000065 implements MigrationInterface {
  name = 'IremboPayIntegration1790000000065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Seed the method, inactive until configured ────────────────────────
    await queryRunner.query(`
      INSERT INTO "payment_methods" ("name", "code", "description", "is_active", "sort_order")
      VALUES ('IremboPay', 'IREMBOPAY', 'MoMo, card and bank payments via IremboPay', false, 5)
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "payment_method_settings" ("payment_method_id", "settings", "is_test_mode", "is_configured")
      SELECT "id", '{}', true, false FROM "payment_methods" WHERE "code" = 'IREMBOPAY'
      ON CONFLICT ("payment_method_id") DO NOTHING
    `);

    // ── 2. Multi-provider columns on the existing ledger ─────────────────────
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
        ADD COLUMN IF NOT EXISTS "provider"                varchar(30) NOT NULL DEFAULT 'intouchpay',
        ADD COLUMN IF NOT EXISTS "invoice_number"          varchar(50),
        ADD COLUMN IF NOT EXISTS "payment_link_url"        text,
        ADD COLUMN IF NOT EXISTS "provider_payment_method" varchar(30),
        ADD COLUMN IF NOT EXISTS "paid_amount"             numeric(12,2),
        ADD COLUMN IF NOT EXISTS "balance"                 numeric(12,2)
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ptx_invoice_number" ON "payment_transactions" ("invoice_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "mobile_phone" DROP NOT NULL`,
    );

    // ── 3. Provider-side invoice mirror ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "irembopay_invoices" (
        "id"                         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
        "transaction_id"             VARCHAR(100) NOT NULL UNIQUE,
        "invoice_number"             VARCHAR(50)  UNIQUE,
        "payment_account_identifier" VARCHAR(50)  NOT NULL,
        "amount"                     NUMERIC(12,2) NOT NULL,
        "currency"                   VARCHAR(3)   NOT NULL DEFAULT 'RWF',
        "payment_status"             VARCHAR(20)  NOT NULL DEFAULT 'NEW',
        "payment_method"             VARCHAR(30),
        "payment_reference"          VARCHAR(100),
        "payment_link_url"           TEXT,
        "expiry_at"                  TIMESTAMPTZ,
        "paid_at"                    TIMESTAMPTZ,
        "partial_payment_enabled"    BOOLEAN      NOT NULL DEFAULT false,
        "paid_amount"                NUMERIC(12,2),
        "balance"                    NUMERIC(12,2),
        "payment_type_key"           VARCHAR(50),
        "reference_id"               UUID,
        "is_test"                    BOOLEAN      NOT NULL DEFAULT true,
        "raw_payload"                JSONB,
        "created_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_status" ON "irembopay_invoices" ("payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_ref" ON "irembopay_invoices" ("reference_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_created" ON "irembopay_invoices" ("created_at")`,
    );

    // ── 4. Product mapping — editable from Settings, never hardcoded ─────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_type_provider_products" (
        "id"                         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
        "provider"                   VARCHAR(30)  NOT NULL DEFAULT 'irembopay',
        "payment_type_id"            UUID         NOT NULL REFERENCES "payment_types"("id") ON DELETE CASCADE,
        "payment_type_rate_id"       UUID         REFERENCES "payment_type_rates"("id") ON DELETE CASCADE,
        "product_code"               VARCHAR(60)  NOT NULL,
        "payment_account_identifier" VARCHAR(50),
        "created_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    // COALESCE in the index expression: a NULL rate id means "the type's default
    // mapping", and NULLs would otherwise never collide, allowing duplicates.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ptpp_provider_type_rate"
        ON "payment_type_provider_products"
           ("provider", "payment_type_id", COALESCE("payment_type_rate_id", '00000000-0000-0000-0000-000000000000'::uuid))
    `);

    // ── updated_at triggers, matching the other payment tables ──────────────
    for (const tbl of ['irembopay_invoices', 'payment_type_provider_products']) {
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS "trg_${tbl}_updated_at" ON "${tbl}";
        CREATE TRIGGER "trg_${tbl}_updated_at"
        BEFORE UPDATE ON "${tbl}"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_type_provider_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "irembopay_invoices"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ptx_invoice_number"`);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
        DROP COLUMN IF EXISTS "provider",
        DROP COLUMN IF EXISTS "invoice_number",
        DROP COLUMN IF EXISTS "payment_link_url",
        DROP COLUMN IF EXISTS "provider_payment_method",
        DROP COLUMN IF EXISTS "paid_amount",
        DROP COLUMN IF EXISTS "balance"
    `);
    // Restoring NOT NULL would fail on any IremboPay row without an MSISDN, so
    // fill the gap first — those rows are non-mobile payments by definition.
    await queryRunner.query(
      `UPDATE "payment_transactions" SET "mobile_phone" = '' WHERE "mobile_phone" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "mobile_phone" SET NOT NULL`,
    );

    await queryRunner.query(`
      DELETE FROM "payment_method_settings"
      WHERE "payment_method_id" IN (SELECT "id" FROM "payment_methods" WHERE "code" = 'IREMBOPAY')
    `);
    await queryRunner.query(`DELETE FROM "payment_methods" WHERE "code" = 'IREMBOPAY'`);
  }
}
