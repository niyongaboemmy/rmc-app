"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTypeToAnnouncements1750600000013 = void 0;
class AddTypeToAnnouncements1750600000013 {
    constructor() {
        this.name = 'AddTypeToAnnouncements1750600000013';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "type" varchar(30) NOT NULL DEFAULT 'announcement'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "type"
    `);
    }
}
exports.AddTypeToAnnouncements1750600000013 = AddTypeToAnnouncements1750600000013;
//# sourceMappingURL=013-add-type-to-announcements.js.map