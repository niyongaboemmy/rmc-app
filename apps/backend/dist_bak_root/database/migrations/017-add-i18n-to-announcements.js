"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddI18nToAnnouncements1750600000017 = void 0;
class AddI18nToAnnouncements1750600000017 {
    constructor() {
        this.name = 'AddI18nToAnnouncements1750600000017';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD COLUMN IF NOT EXISTS "title_i18n"   jsonb NULL,
      ADD COLUMN IF NOT EXISTS "content_i18n" jsonb NULL
    `);
        await queryRunner.query(`
      UPDATE "announcements"
      SET
        "title_i18n"   = jsonb_build_object('en', "title",   'rw', '', 'ar', ''),
        "content_i18n" = jsonb_build_object('en', "content", 'rw', '', 'ar', '')
      WHERE "title_i18n" IS NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "announcements"
      DROP COLUMN IF EXISTS "title_i18n",
      DROP COLUMN IF EXISTS "content_i18n"
    `);
    }
}
exports.AddI18nToAnnouncements1750600000017 = AddI18nToAnnouncements1750600000017;
//# sourceMappingURL=017-add-i18n-to-announcements.js.map