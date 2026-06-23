import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddI18nToAnnouncements1750600000017 implements MigrationInterface {
  name = 'AddI18nToAnnouncements1750600000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "title_i18n"   jsonb NULL,
      ADD COLUMN IF NOT EXISTS "content_i18n" jsonb NULL
    `);

    /* Back-fill existing rows so the EN locale matches the plain text column. */
    await queryRunner.query(`
      UPDATE "announcements"
      SET
        "title_i18n"   = jsonb_build_object('en', "title",   'rw', '', 'ar', ''),
        "content_i18n" = jsonb_build_object('en', "content", 'rw', '', 'ar', '')
      WHERE "title_i18n" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      DROP COLUMN IF EXISTS "title_i18n",
      DROP COLUMN IF EXISTS "content_i18n"
    `);
  }
}
