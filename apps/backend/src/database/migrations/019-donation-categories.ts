import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin-managed donation categories & sub-funds (previously hardcoded in the
 * frontend donateData.ts). Text is trilingual (en/rw/ar). The stable `key`
 * column matches the keys encoded in donation `message` metadata, so existing
 * donations keep resolving. Content is populated by the donation-content seed.
 */
export class DonationCategories1781957702485 implements MigrationInterface {
  name = 'DonationCategories1781957702485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "donation_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL UNIQUE,
        "icon" varchar(40) NOT NULL DEFAULT 'HandHeart',
        "tone" varchar(10) NOT NULL DEFAULT 'green',
        "image" varchar(500),
        "title_en" varchar(200) NOT NULL DEFAULT '',
        "title_rw" varchar(200) NOT NULL DEFAULT '',
        "title_ar" varchar(200) NOT NULL DEFAULT '',
        "desc_en" text NOT NULL DEFAULT '',
        "desc_rw" text NOT NULL DEFAULT '',
        "desc_ar" text NOT NULL DEFAULT '',
        "long_en" text NOT NULL DEFAULT '',
        "long_rw" text NOT NULL DEFAULT '',
        "long_ar" text NOT NULL DEFAULT '',
        "impact_en" varchar(300) NOT NULL DEFAULT '',
        "impact_rw" varchar(300) NOT NULL DEFAULT '',
        "impact_ar" varchar(300) NOT NULL DEFAULT '',
        "sort_order" integer NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "donation_subfunds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL REFERENCES "donation_categories"("id") ON DELETE CASCADE,
        "key" varchar(40) NOT NULL,
        "image" varchar(500),
        "campaign_slug" varchar(200),
        "label_en" varchar(200) NOT NULL DEFAULT '',
        "label_rw" varchar(200) NOT NULL DEFAULT '',
        "label_ar" varchar(200) NOT NULL DEFAULT '',
        "long_en" text NOT NULL DEFAULT '',
        "long_rw" text NOT NULL DEFAULT '',
        "long_ar" text NOT NULL DEFAULT '',
        "impact_en" varchar(300) NOT NULL DEFAULT '',
        "impact_rw" varchar(300) NOT NULL DEFAULT '',
        "impact_ar" varchar(300) NOT NULL DEFAULT '',
        "examples_en" jsonb NOT NULL DEFAULT '[]',
        "examples_rw" jsonb NOT NULL DEFAULT '[]',
        "examples_ar" jsonb NOT NULL DEFAULT '[]',
        "sort_order" integer NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subfund_category_key" UNIQUE ("category_id", "key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subfunds_category_id" ON "donation_subfunds" ("category_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "donation_subfunds"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "donation_categories"`);
  }
}
