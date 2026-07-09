"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageNotificationEmail1700000000005 = void 0;
class MarriageNotificationEmail1700000000005 {
    constructor() {
        this.name = 'MarriageNotificationEmail1700000000005';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "notification_email" varchar(255)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "notification_email"
    `);
    }
}
exports.MarriageNotificationEmail1700000000005 = MarriageNotificationEmail1700000000005;
//# sourceMappingURL=005-marriage-notification-email.js.map