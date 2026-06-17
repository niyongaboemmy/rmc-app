import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageNotificationPhone1700000000008 implements MigrationInterface {
  name = 'MarriageNotificationPhone1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "notification_phone" varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "notification_phone"
    `);
  }
}
