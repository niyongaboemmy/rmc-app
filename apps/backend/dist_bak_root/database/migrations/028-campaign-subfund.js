"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignSubFund1782800000000 = void 0;
class CampaignSubFund1782800000000 {
    constructor() {
        this.name = 'CampaignSubFund1782800000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "sub_fund_id" uuid`);
        await queryRunner.query(`ALTER TABLE "donation_campaigns"
         ADD CONSTRAINT "FK_campaigns_sub_fund_id"
         FOREIGN KEY ("sub_fund_id") REFERENCES "donation_subfunds"("id") ON DELETE SET NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_campaigns_sub_fund_id" ON "donation_campaigns" ("sub_fund_id")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campaigns_sub_fund_id"`);
        await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP CONSTRAINT IF EXISTS "FK_campaigns_sub_fund_id"`);
        await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "sub_fund_id"`);
    }
}
exports.CampaignSubFund1782800000000 = CampaignSubFund1782800000000;
//# sourceMappingURL=028-campaign-subfund.js.map