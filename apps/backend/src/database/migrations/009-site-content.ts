import { MigrationInterface, QueryRunner } from 'typeorm';

export class SiteContent1700000000009 implements MigrationInterface {
  name = 'SiteContent1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_content" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "section_key" varchar(64) NOT NULL,
        "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_site_content" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_site_content_section_key" UNIQUE ("section_key")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_content_section_key"
      ON "site_content" ("section_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_site_content_section_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_content"`);
  }
}
