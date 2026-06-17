import { MigrationInterface, QueryRunner } from 'typeorm';

export class GalleryImageVersions1700000000007 implements MigrationInterface {
  name = 'GalleryImageVersions1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gallery_items"
      ADD COLUMN IF NOT EXISTS "thumbnail_key" varchar(500),
      ADD COLUMN IF NOT EXISTS "medium_key" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gallery_items"
      DROP COLUMN IF EXISTS "thumbnail_key",
      DROP COLUMN IF EXISTS "medium_key"
    `);
  }
}
