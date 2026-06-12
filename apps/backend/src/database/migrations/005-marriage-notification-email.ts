import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageNotificationEmail1700000000005 implements MigrationInterface {
  name = 'MarriageNotificationEmail1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "notification_email" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "notification_email"
    `);
  }
}
