import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Good Conduct notification events were seeded SMS-only in migration 033.
 * The service now also sends branded HTML emails (when the applicant supplied
 * one — email is optional on the request form), so these 7 events become
 * email-applicable too, enabled by default like their SMS counterparts.
 */
export class GoodConductEmailNotifications1700000000034 implements MigrationInterface {
  name = 'GoodConductEmailNotifications1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "notification_settings"
      SET "email_applicable" = true, "email_enabled" = true
      WHERE "event_key" LIKE 'goodConduct.%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "notification_settings"
      SET "email_applicable" = false, "email_enabled" = false
      WHERE "event_key" LIKE 'goodConduct.%'
    `);
  }
}
