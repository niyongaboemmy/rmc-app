"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersViewDrivePermission1781957702513 = void 0;
class UsersViewDrivePermission1781957702513 {
    constructor() {
        this.name = 'UsersViewDrivePermission1781957702513';
    }
    async up(queryRunner) {
        await queryRunner.query(`UPDATE "roles"
       SET "permissions" = "permissions" || $1::jsonb,
           "updated_at"  = now()
       WHERE "slug" IN ('superadmin', 'admin')
         AND NOT ("permissions" @> $1::jsonb)`, [JSON.stringify(['users:view_drive'])]);
    }
    async down(queryRunner) {
        await queryRunner.query(`UPDATE "roles"
       SET "permissions" = (
         SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
         FROM jsonb_array_elements("permissions") AS elem
         WHERE elem::text != $1
       ),
       "updated_at" = now()
       WHERE "slug" IN ('superadmin', 'admin')`, [JSON.stringify('users:view_drive')]);
    }
}
exports.UsersViewDrivePermission1781957702513 = UsersViewDrivePermission1781957702513;
//# sourceMappingURL=1781957702513-027-users-view-drive-permission.js.map