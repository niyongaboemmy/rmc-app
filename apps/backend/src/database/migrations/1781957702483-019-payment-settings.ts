import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the payment settings tables and seeds the initial payment methods and types.
 *
 * Tables:
 *  - payment_methods        — supported payment channels (MOMO, Bank, Card, Cash)
 *  - payment_types          — service areas that require payment (Donation, Marriage, etc.)
 *  - payment_method_settings — credentials/config per payment method (one row per method)
 *
 * Keys in payment_types are immutable; only isActive may change via the admin UI.
 */
export class PaymentSettings1781957702483 implements MigrationInterface {
  name = 'PaymentSettings1781957702483';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── payment_methods ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_methods" (
        "id"          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"        VARCHAR(100) NOT NULL,
        "code"        VARCHAR(50)  NOT NULL UNIQUE,
        "description" TEXT,
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        "logo_url"    VARCHAR(255),
        "sort_order"  INTEGER      NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // ── payment_types ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_types" (
        "id"          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"        VARCHAR(100) NOT NULL,
        "key"         VARCHAR(50)  NOT NULL UNIQUE,
        "description" TEXT,
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // ── payment_method_settings ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_method_settings" (
        "id"                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
        "payment_method_id"  UUID        NOT NULL UNIQUE REFERENCES "payment_methods"("id") ON DELETE CASCADE,
        "settings"           JSONB       NOT NULL DEFAULT '{}',
        "is_test_mode"       BOOLEAN     NOT NULL DEFAULT true,
        "is_configured"      BOOLEAN     NOT NULL DEFAULT false,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── seed: payment methods ────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "payment_methods" ("name", "code", "description", "is_active", "sort_order")
      VALUES
        ('Mobile Money (IntouchPay)', 'MOMO_INTOUCH',  'MTN Mobile Money payments via IntouchPay gateway', true,  1),
        ('Bank Transfer',             'BANK_TRANSFER',  'Direct bank account transfers',                     false, 2),
        ('Card Payment',              'CARD',           'Debit / credit card payments',                      false, 3),
        ('Cash',                      'CASH',           'In-person cash payments',                           false, 4)
      ON CONFLICT ("code") DO NOTHING
    `);

    // ── seed: payment types (service areas) ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "payment_types" ("name", "key", "description", "is_active")
      VALUES
        ('Donations',          'DONATION',       'Online donations and charitable giving',           true),
        ('Marriage Fees',      'MARRIAGE_FEE',   'Marriage application and ceremony processing fees', true),
        ('Membership Fees',    'MEMBERSHIP_FEE', 'Annual membership registration fees',               false),
        ('School Fees',        'SCHOOL_FEE',     'Islamic school tuition and enrollment fees',        false),
        ('Event Registration', 'EVENT_FEE',      'Conference and event registration fees',            false),
        ('Zakat',              'ZAKAT',          'Zakat calculation and payment processing',          false)
      ON CONFLICT ("key") DO NOTHING
    `);

    // ── seed: payment_method_settings rows (empty, one per method) ───────────
    await queryRunner.query(`
      INSERT INTO "payment_method_settings" ("payment_method_id", "settings", "is_test_mode", "is_configured")
      SELECT "id", '{}', true, false
      FROM   "payment_methods"
      ON CONFLICT ("payment_method_id") DO NOTHING
    `);

    // ── updated_at auto-trigger for all three tables ──────────────────────────
    // Reuse existing update_updated_at_column() function if it already exists.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
        ) THEN
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $func$
          BEGIN NEW.updated_at = now(); RETURN NEW; END;
          $func$ LANGUAGE plpgsql;
        END IF;
      END $$;
    `);

    for (const tbl of ['payment_methods', 'payment_types', 'payment_method_settings']) {
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS "trg_${tbl}_updated_at" ON "${tbl}";
        CREATE TRIGGER "trg_${tbl}_updated_at"
        BEFORE UPDATE ON "${tbl}"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_method_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);
  }
}
