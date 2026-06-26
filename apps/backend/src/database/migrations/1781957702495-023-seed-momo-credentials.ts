import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds IntouchPay MoMo credentials into payment_method_settings.
 * Uses the test account provided by IntouchPay.
 *
 * partnerPassword is stored as-is (plain text in JSONB).
 * The backend masks it before returning to the frontend.
 *
 * To rotate credentials later: run a plain SQL UPDATE on payment_method_settings
 * for the MOMO_INTOUCH method — no migration needed.
 */
export class SeedMomoCredentials1781957702495 implements MigrationInterface {
  name = 'SeedMomoCredentials1781957702495';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_method_settings
      SET
        settings = jsonb_build_object(
          'username',        'testa004',
          'partnerPassword', '7Iy#+p}<>%0B*Vskc.sw}t+:T0*a.qr!r3;M8FT|',
          'accountNo',       '250260008866',
          'callbackUrl',     'https://api.rmc.org.rw/api/v1/webhooks/intouch-pay',
          'gatewayUrl',      'https://www.intouchpay.co.rw/api/requestpayment/'
        ),
        is_test_mode   = true,
        is_configured  = true,
        updated_at     = now()
      WHERE payment_method_id = (
        SELECT id FROM payment_methods WHERE code = 'MOMO_INTOUCH' LIMIT 1
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_method_settings
      SET
        settings      = '{}',
        is_configured = false,
        is_test_mode  = true,
        updated_at    = now()
      WHERE payment_method_id = (
        SELECT id FROM payment_methods WHERE code = 'MOMO_INTOUCH' LIMIT 1
      )
    `);
  }
}
