import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes IremboPay product mappings currency- and environment-aware, ready for
 * the production merchant.
 *
 * Production has one product per (service × currency) — Sadaqat_RWF,
 * Sadaqat_USD, Sadaqat_EUR … — and one payment account per currency. A mapping
 * keyed only by payment type cannot say which of the three Sadaqat codes a
 * EUR invoice needs, so `currency` joins the key.
 *
 * `environment` joins it too, so the sandbox mappings are kept rather than
 * overwritten: every existing row was written against the sandbox merchant and
 * is labelled `sandbox` here. The live path picks rows by the gateway's
 * Test-mode flag, and going back to sandbox needs no re-seed.
 *
 * `irembopay_invoices.environment` exists for the same reason. `is_test` cannot
 * tell environments apart: it is also true for admin test-panel invoices on
 * production. Reconciliation must only poll invoices that exist on the host it
 * is talking to.
 *
 * Also adds the two payment types production has products for and we had no
 * key for (Qur'an Support, Zakat al-Fitr), and activates ZAKAT, which now has
 * a live product (Zakatul maal).
 */
export class IremboPayProductionCatalog1790000000085 implements MigrationInterface {
  name = 'IremboPayProductionCatalog1790000000085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_type_provider_products"
        ADD COLUMN IF NOT EXISTS "currency" char(3) NOT NULL DEFAULT 'RWF',
        ADD COLUMN IF NOT EXISTS "environment" varchar(10) NOT NULL DEFAULT 'sandbox'
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_type_provider_products"
        ADD CONSTRAINT "CHK_ptpp_environment" CHECK ("environment" IN ('sandbox', 'production'))
    `);

    // The old key would refuse a second currency for the same type.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_ptpp_provider_type_rate"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ptpp_scope" ON "payment_type_provider_products" (
        "provider", "environment", "payment_type_id",
        COALESCE("payment_type_rate_id", '00000000-0000-0000-0000-000000000000'::uuid),
        "currency"
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "irembopay_invoices"
        ADD COLUMN IF NOT EXISTS "environment" varchar(10) NOT NULL DEFAULT 'sandbox'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_irembo_inv_env_status"
        ON "irembopay_invoices" ("environment", "payment_status")
    `);

    await queryRunner.query(`
      INSERT INTO "payment_types" ("key", "name", "description", "is_active")
      VALUES
        ('QURAN_SUPPORT', 'Qur''an Support', 'Donations to Qur''an programmes', true),
        ('ZAKAT_FITR', 'Zakat al-Fitr', 'Zakat al-Fitr, paid before the Eid prayer', true)
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "payment_types" SET "is_active" = true, "name" = 'Zakat al-Mal' WHERE "key" = 'ZAKAT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "payment_types" SET "is_active" = false, "name" = 'Zakat' WHERE "key" = 'ZAKAT'
    `);
    // Cascades their mappings. Rolled back only if nothing was charged against
    // them — a payment_transactions row keeps the key as plain text either way.
    await queryRunner.query(
      `DELETE FROM "payment_types" WHERE "key" IN ('QURAN_SUPPORT', 'ZAKAT_FITR')`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_irembo_inv_env_status"`);
    await queryRunner.query(`ALTER TABLE "irembopay_invoices" DROP COLUMN IF EXISTS "environment"`);

    // Only the sandbox RWF set fits the old one-row-per-type key.
    await queryRunner.query(`
      DELETE FROM "payment_type_provider_products"
       WHERE "environment" <> 'sandbox' OR "currency" <> 'RWF'
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_ptpp_scope"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ptpp_provider_type_rate" ON "payment_type_provider_products" (
        "provider", "payment_type_id",
        COALESCE("payment_type_rate_id", '00000000-0000-0000-0000-000000000000'::uuid)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_type_provider_products"
        DROP CONSTRAINT IF EXISTS "CHK_ptpp_environment",
        DROP COLUMN IF EXISTS "environment",
        DROP COLUMN IF EXISTS "currency"
    `);
  }
}
