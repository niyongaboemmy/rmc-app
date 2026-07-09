"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsAdmin1700000000010 = void 0;
class DonationsAdmin1700000000010 {
    constructor() {
        this.name = 'DonationsAdmin1700000000010';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "donations"
        ADD COLUMN IF NOT EXISTS "donor_name" varchar(150),
        ADD COLUMN IF NOT EXISTS "donor_email" varchar(150),
        ADD COLUMN IF NOT EXISTS "payment_method" varchar(20),
        ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'pending'
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_donations_status" ON "donations" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_donations_donated_at" ON "donations" ("donated_at")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_donated_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donations_status"`);
        await queryRunner.query(`
      ALTER TABLE "donations"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "payment_method",
        DROP COLUMN IF EXISTS "donor_email",
        DROP COLUMN IF EXISTS "donor_name"
    `);
    }
}
exports.DonationsAdmin1700000000010 = DonationsAdmin1700000000010;
//# sourceMappingURL=010-donations-admin.js.map