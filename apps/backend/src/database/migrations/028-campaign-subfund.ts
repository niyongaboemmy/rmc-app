import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Link donation programs (campaigns) to a sub-fund, so a program is created
 * "under" a category's sub-fund and can be shown to donors in that context.
 * Nullable: programs in categories without sub-funds attach at category level
 * (the category is still recorded via the existing `fund_type` key). ON DELETE
 * SET NULL so removing a sub-fund doesn't delete its programs.
 */
export class CampaignSubFund1782800000000 implements MigrationInterface {
  name = 'CampaignSubFund1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "sub_fund_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns"
         ADD CONSTRAINT "FK_campaigns_sub_fund_id"
         FOREIGN KEY ("sub_fund_id") REFERENCES "donation_subfunds"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaigns_sub_fund_id" ON "donation_campaigns" ("sub_fund_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campaigns_sub_fund_id"`);
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" DROP CONSTRAINT IF EXISTS "FK_campaigns_sub_fund_id"`,
    );
    await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "sub_fund_id"`);
  }
}
