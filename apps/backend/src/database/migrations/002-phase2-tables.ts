import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2Tables1700000000002 implements MigrationInterface {
  name = 'Phase2Tables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prayer time adjustments per mosque
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prayer_time_adjustments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "mosque_id" uuid NOT NULL,
        "fajr_adj" integer NOT NULL DEFAULT 0,
        "sunrise_adj" integer NOT NULL DEFAULT 0,
        "dhuhr_adj" integer NOT NULL DEFAULT 0,
        "asr_adj" integer NOT NULL DEFAULT 0,
        "maghrib_adj" integer NOT NULL DEFAULT 0,
        "isha_adj" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prayer_time_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_prayer_time_adjustments_mosque" UNIQUE ("mosque_id"),
        CONSTRAINT "FK_prayer_time_adj_mosque" FOREIGN KEY ("mosque_id")
          REFERENCES "mosques"("id") ON DELETE CASCADE
      )
    `);

    // Verse of day
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verses_of_day" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "surah" integer NOT NULL,
        "ayah" integer NOT NULL,
        "arabic_text" text NOT NULL,
        "translation_en" text NOT NULL,
        "translation_rw" text,
        "reference" varchar(50) NOT NULL,
        "display_date" date NOT NULL,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verses_of_day" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_verses_display_date" UNIQUE ("display_date")
      )
    `);

    // Blog posts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL,
        "description" text,
        CONSTRAINT "PK_blog_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_categories_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_posts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "slug" varchar(280) NOT NULL,
        "excerpt" text,
        "content" text NOT NULL,
        "featured_image" varchar(500),
        "category_id" uuid,
        "author_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "seo_title" varchar(255),
        "seo_description" text,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_posts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_blog_posts_category" FOREIGN KEY ("category_id")
          REFERENCES "blog_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_blog_posts_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_tags" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(80) NOT NULL,
        "slug" varchar(100) NOT NULL,
        CONSTRAINT "PK_blog_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_tags_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_post_tags" (
        "post_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        CONSTRAINT "PK_blog_post_tags" PRIMARY KEY ("post_id", "tag_id"),
        CONSTRAINT "FK_bpt_post" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bpt_tag" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE
      )
    `);

    // Gallery
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gallery_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(255),
        "description" text,
        "file_key" varchar(500) NOT NULL,
        "file_type" varchar(20) NOT NULL DEFAULT 'image',
        "category" varchar(100),
        "uploaded_by" uuid NOT NULL,
        "is_public" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gallery_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_gallery_uploaded_by" FOREIGN KEY ("uploaded_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    // Member registration approval workflow additions
    await queryRunner.query(`
      ALTER TABLE "member_profiles"
        ADD COLUMN IF NOT EXISTS "national_id" varchar(16),
        ADD COLUMN IF NOT EXISTS "category" varchar(30) NOT NULL DEFAULT 'standard',
        ADD COLUMN IF NOT EXISTS "mosque_id" uuid,
        ADD COLUMN IF NOT EXISTS "province_id" uuid,
        ADD COLUMN IF NOT EXISTS "district_id" uuid,
        ADD COLUMN IF NOT EXISTS "sector_id" uuid,
        ADD COLUMN IF NOT EXISTS "photo_key" varchar(500),
        ADD COLUMN IF NOT EXISTS "approval_status" varchar(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "approved_by" uuid,
        ADD COLUMN IF NOT EXISTS "approved_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "rejection_reason" text,
        ADD COLUMN IF NOT EXISTS "member_status" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "status_reason" text,
        ADD COLUMN IF NOT EXISTS "status_changed_by" uuid,
        ADD COLUMN IF NOT EXISTS "status_changed_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_post_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gallery_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verses_of_day"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prayer_time_adjustments"`);
  }
}
