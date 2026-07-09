"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSettingsBothChannels1782500000000 = void 0;
class NotificationSettingsBothChannels1782500000000 {
    constructor() {
        this.name = 'NotificationSettingsBothChannels1782500000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE notification_settings
      SET email_applicable = true,
          sms_applicable   = true
      WHERE event_key LIKE 'auth.%'
    `);
        await queryRunner.query(`
      UPDATE notification_settings
      SET email_applicable = false,
          sms_applicable   = true
      WHERE event_key LIKE 'marriage.%'
    `);
    }
    async down(queryRunner) {
        const patches = [
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
            await queryRunner.query(`UPDATE notification_settings
         SET email_applicable = $1, sms_applicable = $2
         WHERE event_key = $3`, [p.email, p.sms, p.key]);
        }
    }
}
exports.NotificationSettingsBothChannels1782500000000 = NotificationSettingsBothChannels1782500000000;
//# sourceMappingURL=025-notification-settings-both-channels.js.map