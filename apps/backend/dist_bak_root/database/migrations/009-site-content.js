"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteContent1700000000009 = void 0;
class SiteContent1700000000009 {
    constructor() {
        this.name = 'SiteContent1700000000009';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_content" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "section_key" varchar(64) NOT NULL,
        "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_site_content" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_site_content_section_key" UNIQUE ("section_key")
      )
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_content_section_key"
      ON "site_content" ("section_key")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_site_content_section_key"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "site_content"`);
    }
}
exports.SiteContent1700000000009 = SiteContent1700000000009;
//# sourceMappingURL=009-site-content.js.map