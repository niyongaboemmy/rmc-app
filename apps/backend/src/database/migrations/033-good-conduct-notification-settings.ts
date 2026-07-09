import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the 7 Good Conduct notification events (SMS-only, per plan §3/§12),
 * each independently toggleable in /admin/settings, matching the pattern
 * used for the marriage.* rows in migration 023-notification-settings.ts.
 */
export class GoodConductNotificationSettings1700000000033 implements MigrationInterface {
  name = 'GoodConductNotificationSettings1700000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "notification_settings"
        ("event_key", "label", "description", "group_name", "email_applicable", "sms_applicable", "email_enabled", "sms_enabled")
      VALUES
        ('goodConduct.submission',
         'Request Submitted',
         'Notifies the applicant once their Good Conduct request is submitted (payment confirmed).',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.payment_confirmed',
         'Payment Received',
         'Confirms receipt of payment for the Good Conduct request fee.',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.under_review',
         'Request Under Review',
         'Notifies the applicant when their request is picked up by a reviewer.',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.more_info_requested',
         'More Information Requested',
         'Notifies the applicant when a reviewer asks for more information.',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.approved',
         'Request Approved',
         'Notifies the applicant when their Good Conduct request is approved.',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.rejected',
         'Request Rejected',
         'Notifies the applicant when their Good Conduct request is rejected.',
         'Good Conduct Service', false, true, false, true),

        ('goodConduct.certificate_ready',
         'Certificate Ready',
         'Notifies the applicant when their certificate is issued and ready to download.',
         'Good Conduct Service', false, true, false, true)

      ON CONFLICT ("event_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notification_settings" WHERE "event_key" LIKE 'goodConduct.%'
    `);
  }
}
