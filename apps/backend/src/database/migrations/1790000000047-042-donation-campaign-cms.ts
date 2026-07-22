import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Donation-campaign CMS extensions.
 *
 * Additive only — extends the existing `donation_campaigns` program entity with
 * the fields the new campaign management UI + public donate redesign need, and
 * adds a `campaign_updates` table for the per-campaign news feed. Nothing here
 * touches the donations table or the payment flow.
 *
 * The `status` column is a plain varchar with no CHECK constraint, so the new
 * draft/completed/archived statuses need no DB change — the enum + DTO cover it.
 */
export class DonationCampaignCms1790000000047 implements MigrationInterface {
  name = 'DonationCampaignCms1790000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── New campaign columns ────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "is_featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD COLUMN IF NOT EXISTS "cta_text" varchar(60)`,
    );
    // Speeds up the public grid ordering (featured first, then sort_order).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_donation_campaigns_featured" ON "donation_campaigns" ("is_featured")`,
    );

    // ── Campaign updates / news feed ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_updates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "published_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_campaign_updates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_campaign_updates_campaign" FOREIGN KEY ("campaign_id")
          REFERENCES "donation_campaigns"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaign_updates_campaign" ON "campaign_updates" ("campaign_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campaign_updates_campaign"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_updates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_donation_campaigns_featured"`);
    await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "cta_text"`);
    await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "gallery_images"`);
    await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP COLUMN IF EXISTS "is_featured"`);
  }
}
