"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAttachmentsToAnnouncements1750600000016 = void 0;
class AddAttachmentsToAnnouncements1750600000016 {
    constructor() {
        this.name = 'AddAttachmentsToAnnouncements1750600000016';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "attachments" jsonb NOT NULL DEFAULT '[]'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "attachments"
    `);
    }
}
exports.AddAttachmentsToAnnouncements1750600000016 = AddAttachmentsToAnnouncements1750600000016;
//# sourceMappingURL=016-add-attachments-to-announcements.js.map