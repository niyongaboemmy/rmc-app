"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSettingsPermissions1782400000000 = void 0;
class NotificationSettingsPermissions1782400000000 {
    constructor() {
        this.name = 'NotificationSettingsPermissions1782400000000';
    }
    async up(queryRunner) {
        const newPerms = ['notification_settings:view', 'notification_settings:manage'];
        for (const perm of newPerms) {
            await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(
            COALESCE(permissions, '[]'::jsonb) || $1::jsonb
          ) AS elem
        )
        WHERE name IN ('superadmin', 'admin')
      `, [JSON.stringify([perm])]);
        }
    }
    async down(queryRunner) {
        const permsToRemove = ['notification_settings:view', 'notification_settings:manage'];
        for (const perm of permsToRemove) {
            await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb)) AS elem
          WHERE elem::text != $1
        )
        WHERE name IN ('superadmin', 'admin')
      `, [JSON.stringify(perm)]);
        }
    }
}
exports.NotificationSettingsPermissions1782400000000 = NotificationSettingsPermissions1782400000000;
//# sourceMappingURL=024-notification-settings-permissions.js.map