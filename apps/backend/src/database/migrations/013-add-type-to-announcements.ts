import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToAnnouncements1750600000013 implements MigrationInterface {
  name = 'AddTypeToAnnouncements1750600000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "type" varchar(30) NOT NULL DEFAULT 'announcement'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "type"
    `);
  }
}
