"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsConfigPermissions1782000000001 = void 0;
class SmsConfigPermissions1782000000001 {
    constructor() {
        this.name = 'SmsConfigPermissions1782000000001';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(DISTINCT val)
        FROM jsonb_array_elements_text(
          permissions || '["sms_config:view","sms_config:manage"]'::jsonb
        ) AS val
      ),
      updated_at = now()
      WHERE slug = 'superadmin'
    `);
        await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(DISTINCT val)
        FROM jsonb_array_elements_text(
          permissions || '["sms_config:view","sms_config:manage"]'::jsonb
        ) AS val
      ),
      updated_at = now()
      WHERE slug = 'admin'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE val NOT IN ('sms_config:view', 'sms_config:manage')
      ),
      updated_at = now()
    `);
    }
}
exports.SmsConfigPermissions1782000000001 = SmsConfigPermissions1782000000001;
//# sourceMappingURL=021-sms-config-permissions.js.map