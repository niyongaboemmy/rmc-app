import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToAnnouncements1750600000016 implements MigrationInterface {
  name = 'AddAttachmentsToAnnouncements1750600000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "attachments" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "attachments"
    `);
  }
}
