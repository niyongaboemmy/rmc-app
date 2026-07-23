import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Payment-reminder support for Good Conduct:
 *  - a `payment_reminder_sent_at` stamp so each request is reminded at most once
 *  - a toggleable `goodConduct.payment_reminder` notification event
 */
export class GoodConductPaymentReminder1786200000038 implements MigrationInterface {
  name = 'GoodConductPaymentReminder1786200000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "good_conduct_requests"
      ADD COLUMN IF NOT EXISTS "payment_reminder_sent_at" timestamptz
    `);

    await queryRunner.query(`
      INSERT INTO "notification_settings"
        ("event_key", "label", "description", "group_name",
         "email_applicable", "sms_applicable", "email_enabled", "sms_enabled")
      VALUES
        ('goodConduct.payment_reminder',
         'Payment Reminder',
         'Reminds an applicant to complete payment for a Good Conduct request that is still unpaid.',
         'Good Conduct Service', true, true, true, true)
      ON CONFLICT ("event_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notification_settings" WHERE "event_key" = 'goodConduct.payment_reminder'`,
    );
    await queryRunner.query(
      `ALTER TABLE "good_conduct_requests" DROP COLUMN IF EXISTS "payment_reminder_sent_at"`,
    );
  }
}
