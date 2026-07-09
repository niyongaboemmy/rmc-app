"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSettings1786000000000 = void 0;
class AiSettings1786000000000 {
    constructor() {
        this.name = 'AiSettings1786000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_settings" (
        "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "default_provider" varchar(20)  NOT NULL DEFAULT 'gemini',
        "openai_key_enc"   text         NOT NULL DEFAULT '',
        "gemini_key_enc"   text         NOT NULL DEFAULT '',
        "openai_model"     varchar(80)  NOT NULL DEFAULT 'gpt-4o-mini',
        "gemini_model"     varchar(80)  NOT NULL DEFAULT 'gemini-2.5-flash',
        "is_active"        boolean      NOT NULL DEFAULT false,
        "updated_by"       uuid,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      INSERT INTO "ai_settings" ("default_provider")
      SELECT 'gemini'
      WHERE NOT EXISTS (SELECT 1 FROM "ai_settings")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_settings"`);
    }
}
exports.AiSettings1786000000000 = AiSettings1786000000000;
//# sourceMappingURL=027-ai-settings.js.map