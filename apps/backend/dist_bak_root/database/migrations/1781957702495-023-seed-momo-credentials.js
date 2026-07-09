"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedMomoCredentials1781957702495 = void 0;
class SeedMomoCredentials1781957702495 {
    constructor() {
        this.name = 'SeedMomoCredentials1781957702495';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.SeedMomoCredentials1781957702495 = SeedMomoCredentials1781957702495;
//# sourceMappingURL=1781957702495-023-seed-momo-credentials.js.map