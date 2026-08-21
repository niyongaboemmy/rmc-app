import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the 6 tender-application notification events, each independently
 * toggleable in /admin/settings — same shape as the marriage.* rows (023) and
 * goodConduct.* rows (033).
 *
 * Both channels are applicable here (unlike Good Conduct, which is SMS-only):
 * bidders are companies and email is the norm for procurement correspondence.
 */
export class TenderNotificationSettings1786100000036 implements MigrationInterface {
  name = 'TenderNotificationSettings1786100000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "notification_settings"
        ("event_key", "label", "description", "group_name", "email_applicable", "sms_applicable", "email_enabled", "sms_enabled")
      VALUES
        ('tender.submission',
         'Bid Submitted',
         'Confirms to the bidder that their tender application was received.',
         'Tender Service', true, true, true, true),

        ('tender.under_review',
         'Bid Under Review',
         'Notifies the bidder when the evaluation committee picks up their bid.',
         'Tender Service', true, true, true, true),

        ('tender.more_info_requested',
         'More Information Requested',
         'Notifies the bidder when an evaluator asks for more information or a corrected document.',
         'Tender Service', true, true, true, true),

        ('tender.shortlisted',
         'Bid Shortlisted',
         'Notifies the bidder when their bid passes evaluation and is shortlisted.',
         'Tender Service', true, true, true, true),

        ('tender.awarded',
         'Tender Awarded',
         'Notifies the bidder when the tender is awarded to them.',
         'Tender Service', true, true, true, true),

        ('tender.rejected',
         'Bid Rejected',
         'Notifies the bidder when their bid is not successful.',
         'Tender Service', true, true, true, true)

      ON CONFLICT ("event_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notification_settings" WHERE "event_key" LIKE 'tender.%'
    `);
  }
}
