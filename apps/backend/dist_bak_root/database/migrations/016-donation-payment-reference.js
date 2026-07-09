"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationPaymentReference1781957702482 = void 0;
class DonationPaymentReference1781957702482 {
    constructor() {
        this.name = 'DonationPaymentReference1781957702482';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "donations"
        ADD COLUMN IF NOT EXISTS "payment_reference" varchar(100),
        ADD COLUMN IF NOT EXISTS "donor_phone" varchar(20)
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_donations_payment_reference" ON "donations" ("payment_reference")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_payment_reference"`);
        await queryRunner.query(`
      ALTER TABLE "donations"
        DROP COLUMN IF EXISTS "donor_phone",
        DROP COLUMN IF EXISTS "payment_reference"
    `);
    }
}
exports.DonationPaymentReference1781957702482 = DonationPaymentReference1781957702482;
//# sourceMappingURL=016-donation-payment-reference.js.map