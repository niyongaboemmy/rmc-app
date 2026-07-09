"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationCategorySoftDelete1782700000000 = void 0;
class DonationCategorySoftDelete1782700000000 {
    constructor() {
        this.name = 'DonationCategorySoftDelete1782700000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "donation_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "donation_categories" DROP COLUMN IF EXISTS "deleted_at"`);
    }
}
exports.DonationCategorySoftDelete1782700000000 = DonationCategorySoftDelete1782700000000;
//# sourceMappingURL=027-donation-category-soft-delete.js.map