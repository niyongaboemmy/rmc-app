"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSettingsPermissions1786000000001 = void 0;
class AiSettingsPermissions1786000000001 {
    constructor() {
        this.name = 'AiSettingsPermissions1786000000001';
    }
    async up(queryRunner) {
        for (const slug of ['superadmin', 'admin']) {
            await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT val)
          FROM jsonb_array_elements_text(
            permissions || '["ai_settings:view","ai_settings:manage"]'::jsonb
          ) AS val
        ),
        updated_at = now()
        WHERE slug = $1
      `, [slug]);
        }
    }
    async down(queryRunner) {
        await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE val NOT IN ('ai_settings:view', 'ai_settings:manage')
      ),
      updated_at = now()
    `);
    }
}
exports.AiSettingsPermissions1786000000001 = AiSettingsPermissions1786000000001;
//# sourceMappingURL=028-ai-settings-permissions.js.map