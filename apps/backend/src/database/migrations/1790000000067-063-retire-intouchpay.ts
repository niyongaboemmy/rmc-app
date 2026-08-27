import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires IntouchPay as a payment gateway. IremboPay is the sole provider.
 *
 * The guiding rule: **no historical row is deleted or rewritten.** Every
 * `payment_transactions` row with `provider = 'intouchpay'` and every
 * `payment_provider_events` row it produced is the financial record, and stays
 * exactly as it is. What changes is only what happens *next*:
 *
 *  1. the method is deactivated — and renamed so the archive still reads
 *     sensibly — but the row survives, because `payment_transactions
 *     .payment_method_code` carries 'MOMO_INTOUCH' and admin reporting joins on
 *     it. Deleting the row would blank the method name on every historical
 *     transaction;
 *  2. the stored credentials are cleared. The gateway is gone, so a live partner
 *     password sitting in a jsonb blob is a liability with no upside;
 *  3. the `provider` column defaults move to the surviving gateway, so new rows
 *     stop being stamped with a provider that no longer exists.
 */
export class RetireIntouchPay1790000000067 implements MigrationInterface {
  name = 'RetireIntouchPay1790000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Deactivate the method. NEVER DELETE THE ROW ───────────────────────
    await queryRunner.query(`
      UPDATE "payment_methods"
         SET "is_active"   = false,
             "name"        = 'Mobile Money (IntouchPay — retired)',
             "description" = 'Retired 2026-08. Historical transactions only.'
       WHERE "code" = 'MOMO_INTOUCH'
    `);

    // ── 2. Clear the stored credentials ──────────────────────────────────────
    await queryRunner.query(`
      UPDATE "payment_method_settings"
         SET "settings" = '{}'::jsonb, "is_configured" = false
       WHERE "payment_method_id" = (
         SELECT "id" FROM "payment_methods" WHERE "code" = 'MOMO_INTOUCH' LIMIT 1
       )
    `);

    // ── 3. New rows default to the surviving provider ────────────────────────
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "provider" SET DEFAULT 'irembopay'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_provider_events" ALTER COLUMN "provider" SET DEFAULT 'irembopay'`,
    );
  }

  /**
   * Restores the defaults and reactivates the method.
   *
   * It deliberately CANNOT restore the credentials cleared in `up()` — they were
   * removed on purpose, and re-seeding a live merchant password from a migration
   * would defeat the reason for clearing it. Rolling back to IntouchPay
   * therefore also means an admin re-entering the keys through
   * Admin → Settings → Payments. Thirty seconds of typing is an acceptable
   * rollback cost; a forgotten live secret in a jsonb column is not.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_provider_events" ALTER COLUMN "provider" SET DEFAULT 'intouchpay'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "provider" SET DEFAULT 'intouchpay'`,
    );

    await queryRunner.query(`
      UPDATE "payment_methods"
         SET "is_active"   = true,
             "name"        = 'Mobile Money (IntouchPay)',
             "description" = 'MTN Mobile Money payments via IntouchPay gateway'
       WHERE "code" = 'MOMO_INTOUCH'
    `);
  }
}
