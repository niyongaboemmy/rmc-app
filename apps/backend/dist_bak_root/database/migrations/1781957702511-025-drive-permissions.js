"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivePermissions1781957702511 = void 0;
class DrivePermissions1781957702511 {
    constructor() {
        this.name = 'DrivePermissions1781957702511';
        this.USER_PERMS = [
            'drive:view',
            'drive:create',
            'drive:edit',
            'drive:delete',
            'drive:share',
        ];
        this.ADMIN_EXTRA = ['drive:admin'];
    }
    async up(queryRunner) {
        for (const perm of this.USER_PERMS) {
            await queryRunner.query(`UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb,
             "updated_at"  = now()
         WHERE "slug" IN ('superadmin', 'admin', 'user')
           AND NOT ("permissions" @> $1::jsonb)`, [JSON.stringify([perm])]);
        }
        for (const perm of this.ADMIN_EXTRA) {
            await queryRunner.query(`UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb,
             "updated_at"  = now()
         WHERE "slug" IN ('superadmin', 'admin')
           AND NOT ("permissions" @> $1::jsonb)`, [JSON.stringify([perm])]);
        }
    }
    async down(queryRunner) {
        const allDrivePerms = [...this.USER_PERMS, ...this.ADMIN_EXTRA];
        for (const perm of allDrivePerms) {
            await queryRunner.query(`UPDATE "roles"
         SET "permissions" = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements("permissions") AS elem
           WHERE elem::text != $1
         ),
         "updated_at" = now()
         WHERE "slug" IN ('superadmin', 'admin', 'user')`, [JSON.stringify(perm)]);
        }
    }
}
exports.DrivePermissions1781957702511 = DrivePermissions1781957702511;
//# sourceMappingURL=1781957702511-025-drive-permissions.js.map