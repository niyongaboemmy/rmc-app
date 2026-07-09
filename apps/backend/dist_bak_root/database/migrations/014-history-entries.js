"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryEntries1750600000014 = void 0;
class HistoryEntries1750600000014 {
    constructor() {
        this.name = 'HistoryEntries1750600000014';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "history_entries" (
        "id"              uuid        NOT NULL DEFAULT gen_random_uuid(),
        "year"            int         NOT NULL,
        "titleEn"         varchar(200) NOT NULL,
        "titleRw"         varchar(200) NOT NULL DEFAULT '',
        "titleAr"         varchar(200) NOT NULL DEFAULT '',
        "descriptionEn"   text        NOT NULL,
        "descriptionRw"   text        NOT NULL DEFAULT '',
        "descriptionAr"   text        NOT NULL DEFAULT '',
        "imageKey"        varchar,
        "sortOrder"       int         NOT NULL DEFAULT 0,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_history_entries" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_history_entries_year" ON "history_entries" ("year")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "history_entries"`);
    }
}
exports.HistoryEntries1750600000014 = HistoryEntries1750600000014;
//# sourceMappingURL=014-history-entries.js.map