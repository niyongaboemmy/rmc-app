"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageNotificationPhone1700000000008 = void 0;
class MarriageNotificationPhone1700000000008 {
    constructor() {
        this.name = 'MarriageNotificationPhone1700000000008';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "notification_phone" varchar(30)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "notification_phone"
    `);
    }
}
exports.MarriageNotificationPhone1700000000008 = MarriageNotificationPhone1700000000008;
//# sourceMappingURL=008-marriage-notification-phone.js.map