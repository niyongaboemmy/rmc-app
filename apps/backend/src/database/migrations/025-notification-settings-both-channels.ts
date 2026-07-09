import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Authentication events: both Email and SMS available (admin picks which to enable).
 * Marriage events: SMS-only — email is not applicable for marriage notifications.
 */
export class NotificationSettingsBothChannels1782500000000 implements MigrationInterface {
  name = 'NotificationSettingsBothChannels1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* Auth events — open both channels */
    await queryRunner.query(`
      UPDATE notification_settings
      SET email_applicable = true,
          sms_applicable   = true
      WHERE event_key LIKE 'auth.%'
    `);

    /* Marriage events — SMS only */
    await queryRunner.query(`
      UPDATE notification_settings
      SET email_applicable = false,
          sms_applicable   = true
      WHERE event_key LIKE 'marriage.%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const patches: Array<{ key: string; email: boolean; sms: boolean }> = [
      { key: 'auth.welcome_email', email: true, sms: false },
      { key: 'auth.password_reset', email: true, sms: false },
      { key: 'auth.password_changed', email: true, sms: false },
      { key: 'auth.otp_sms', email: false, sms: true },
      { key: 'marriage.submission', email: false, sms: true },
      { key: 'marriage.status_change', email: false, sms: true },
      { key: 'marriage.ceremony_scheduled', email: false, sms: true },
      { key: 'marriage.payment_confirmed', email: false, sms: true },
      { key: 'marriage.party_confirmation', email: false, sms: true },
    ];

    for (const p of patches) {
      await queryRunner.query(
        `UPDATE notification_settings
         SET email_applicable = $1, sms_applicable = $2
         WHERE event_key = $3`,
        [p.email, p.sms, p.key],
      );
    }
  }
}
