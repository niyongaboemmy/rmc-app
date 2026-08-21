import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 023 seeded MOMO_INTOUCH.callbackUrl as https://api.rmc.org.rw/... —
 * a domain that was never deployed (no DNS record, ever). The app actually
 * runs on isengesho.com (see DEPLOYMENT.md). Since callbackUrl is stored in
 * the DB and read as `creds.callbackUrl || fallbackCallback`, the dead
 * rmc.org.rw value has been overriding the correct fallback in every
 * RequestPayment/RequestDeposit call, so IntouchPay's transaction-status
 * callback (§2.7) has been posted to a host that doesn't resolve.
 */
export class FixMomoIntouchCallbackUrl1786000000200 implements MigrationInterface {
  name = 'FixMomoIntouchCallbackUrl1786000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_method_settings
      SET
        settings   = jsonb_set(
          settings,
          '{callbackUrl}',
          '"https://api.isengesho.com/api/v1/webhooks/intouch-pay"'
        ),
        updated_at = now()
      WHERE payment_method_id = (
        SELECT id FROM payment_methods WHERE code = 'MOMO_INTOUCH' LIMIT 1
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_method_settings
      SET
        settings   = jsonb_set(
          settings,
          '{callbackUrl}',
          '"https://api.rmc.org.rw/api/v1/webhooks/intouch-pay"'
        ),
        updated_at = now()
      WHERE payment_method_id = (
        SELECT id FROM payment_methods WHERE code = 'MOMO_INTOUCH' LIMIT 1
      )
    `);
  }
}
