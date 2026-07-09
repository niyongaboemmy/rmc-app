"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSettings1782300000000 = void 0;
class NotificationSettings1782300000000 {
    constructor() {
        this.name = 'NotificationSettings1782300000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_settings" (
        "id"                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_key"         varchar(100)  NOT NULL,
        "label"             varchar(200)  NOT NULL,
        "description"       text,
        "group_name"        varchar(100)  NOT NULL,
        "email_applicable"  boolean       NOT NULL DEFAULT true,
        "sms_applicable"    boolean       NOT NULL DEFAULT true,
        "email_enabled"     boolean       NOT NULL DEFAULT false,
        "sms_enabled"       boolean       NOT NULL DEFAULT false,
        "created_at"        timestamptz   NOT NULL DEFAULT now(),
        "updated_at"        timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "uq_notification_settings_event_key" UNIQUE ("event_key")
      )
    `);
        await queryRunner.query(`
      INSERT INTO "notification_settings"
        ("event_key", "label", "description", "group_name", "email_applicable", "sms_applicable", "email_enabled", "sms_enabled")
      VALUES
        -- Authentication
        ('auth.welcome_email',
         'Welcome Email',
         'Sent to new users immediately after registration.',
         'Authentication', true, true, true, false),

        ('auth.password_reset',
         'Password Reset',
         'Sends a reset link when the user requests a new password.',
         'Authentication', true, true, true, false),

        ('auth.password_changed',
         'Password Changed',
         'Confirmation sent after a successful password change.',
         'Authentication', true, true, true, false),

        ('auth.otp_sms',
         'OTP Verification Code',
         'One-time code sent via SMS to verify the user''s phone number.',
         'Authentication', true, true, false, true),

        -- Marriage Service (SMS-only — email not applicable)
        ('marriage.submission',
         'Application Submitted',
         'Notifies the applicant after their marriage application is received.',
         'Marriage Service', false, true, false, true),

        ('marriage.status_change',
         'Application Status Change',
         'Notifies the applicant when their application status is updated (approved, rejected, etc.).',
         'Marriage Service', false, true, false, true),

        ('marriage.ceremony_scheduled',
         'Ceremony Date Confirmed',
         'Sends the confirmed ceremony date and time to the applicant.',
         'Marriage Service', false, true, false, true),

        ('marriage.payment_confirmed',
         'Payment Received',
         'Confirms receipt of payment for the marriage application fee.',
         'Marriage Service', false, true, false, true),

        ('marriage.party_confirmation',
         'Party Confirmation Request',
         'Sends a confirmation link to witnesses, groom, and bride to confirm participation.',
         'Marriage Service', false, true, false, true)

      ON CONFLICT ("event_key") DO NOTHING
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
    }
}
exports.NotificationSettings1782300000000 = NotificationSettings1782300000000;
//# sourceMappingURL=023-notification-settings.js.map