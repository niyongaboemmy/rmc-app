"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentTypeRates1781957702490 = void 0;
class PaymentTypeRates1781957702490 {
    constructor() {
        this.name = 'PaymentTypeRates1781957702490';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE payment_types
      ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2) DEFAULT NULL
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_type_rates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_type_id UUID NOT NULL REFERENCES payment_types(id) ON DELETE CASCADE,
        code            VARCHAR(50)   DEFAULT NULL,
        name            VARCHAR(150)  NOT NULL,
        description     TEXT          DEFAULT NULL,
        amount          NUMERIC(14,2) NOT NULL,
        is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
        sort_order      INT           NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_type_rates_type
      ON payment_type_rates (payment_type_id)
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_type_rates_code
      ON payment_type_rates (payment_type_id, code)
      WHERE code IS NOT NULL
    `);
        await queryRunner.query(`
      INSERT INTO payment_type_rates (payment_type_id, code, name, description, amount, sort_order)
      SELECT
        pt.id,
        r.code,
        r.name,
        r.description,
        r.amount,
        r.sort_order
      FROM payment_types pt
      CROSS JOIN (VALUES
        ('MOSQUE',         'Mosque Ceremony',   'Nikah ceremony conducted inside the mosque',        30000,  0),
        ('OUTSIDE_MOSQUE', 'Outside Mosque',    'Nikah ceremony conducted outside mosque premises',  200000, 1)
      ) AS r(code, name, description, amount, sort_order)
      WHERE pt.key = 'MARRIAGE_FEE'
      ON CONFLICT DO NOTHING
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS payment_type_rates`);
        await queryRunner.query(`ALTER TABLE payment_types DROP COLUMN IF EXISTS amount`);
    }
}
exports.PaymentTypeRates1781957702490 = PaymentTypeRates1781957702490;
//# sourceMappingURL=1781957702490-022-payment-type-rates.js.map