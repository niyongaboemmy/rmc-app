"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshRolePermissions1781957702482 = void 0;
class RefreshRolePermissions1781957702482 {
    constructor() {
        this.name = 'RefreshRolePermissions1781957702482';
        this.ALL_PERMISSIONS = [
            'users:view', 'users:create', 'users:edit', 'users:delete', 'users:assign_role',
            'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
            'members:view', 'members:create', 'members:edit', 'members:delete',
            'members:approve', 'members:id_card',
            'mosques:view', 'mosques:create', 'mosques:edit', 'mosques:delete',
            'mosques:manage_imams',
            'prayer_times:view', 'prayer_times:manage',
            'content:view', 'content:create', 'content:edit', 'content:delete',
            'finance:view', 'finance:manage',
            'donations:view', 'donations:manage',
            'schools:view', 'schools:manage',
            'contact_messages:view', 'contact_messages:manage',
            'reports:view', 'reports:export',
            'marriage:view', 'marriage:manage', 'marriage:approve',
            'marriage:assign_imam', 'marriage:certificate', 'marriage:reports',
            'system:settings', 'audit_log:view',
        ];
        this.OPERATOR_PERMISSIONS = [
            'members:view', 'members:create', 'members:edit', 'members:approve', 'members:id_card',
            'mosques:view',
            'prayer_times:view',
            'content:view', 'content:create', 'content:edit',
            'reports:view',
        ];
        this.ADMIN_PERMISSIONS = [
            ...this.OPERATOR_PERMISSIONS,
            'members:delete',
            'mosques:create', 'mosques:edit', 'mosques:manage_imams',
            'prayer_times:manage',
            'content:delete',
            'finance:view',
            'donations:view', 'donations:manage',
            'schools:view', 'schools:manage',
            'contact_messages:view', 'contact_messages:manage',
            'reports:export',
            'users:view', 'users:create', 'users:edit', 'users:assign_role',
            'roles:view',
            'audit_log:view',
        ];
        this.MARRIAGE_OFFICER_PERMISSIONS = [
            'marriage:view', 'marriage:manage', 'marriage:approve',
            'marriage:assign_imam', 'marriage:certificate', 'marriage:reports',
            'members:view',
            'mosques:view',
            'content:view',
        ];
        this.MEMBER_PERMISSIONS = [
            'prayer_times:view',
            'content:view',
        ];
        this.roles = [
            {
                name: 'Super Admin',
                slug: 'superadmin',
                description: 'Full system access — cannot be deleted',
                permissions: 'ALL',
                is_system: true,
            },
            {
                name: 'Admin',
                slug: 'admin',
                description: 'Administrative access without system settings',
                permissions: 'ADMIN',
                is_system: true,
            },
            {
                name: 'Operator',
                slug: 'operator',
                description: 'Day-to-day operations: members, content, prayer times',
                permissions: 'OPERATOR',
                is_system: true,
            },
            {
                name: 'Marriage Officer',
                slug: 'marriage_officer',
                description: 'Manages marriage applications, scheduling, and certificates',
                permissions: 'MARRIAGE_OFFICER',
                is_system: false,
            },
            {
                name: 'Member',
                slug: 'user',
                description: 'Standard registered member',
                permissions: 'MEMBER',
                is_system: true,
            },
        ];
    }
    resolvePermissions(key) {
        switch (key) {
            case 'ALL': return this.ALL_PERMISSIONS;
            case 'ADMIN': return this.ADMIN_PERMISSIONS;
            case 'OPERATOR': return this.OPERATOR_PERMISSIONS;
            case 'MARRIAGE_OFFICER': return this.MARRIAGE_OFFICER_PERMISSIONS;
            case 'MEMBER': return this.MEMBER_PERMISSIONS;
            default: return [];
        }
    }
    async up(queryRunner) {
        for (const role of this.roles) {
            const perms = this.resolvePermissions(role.permissions);
            const permsJson = JSON.stringify(perms);
            await queryRunner.query(`
        INSERT INTO "roles" ("id", "name", "slug", "description", "permissions", "is_system")
        VALUES (
          gen_random_uuid(),
          $1, $2, $3,
          $4::jsonb,
          $5
        )
        ON CONFLICT ("slug") DO UPDATE
          SET
            "name"        = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "permissions" = EXCLUDED."permissions",
            "is_system"   = EXCLUDED."is_system",
            "updated_at"  = now()
      `, [role.name, role.slug, role.description, permsJson, role.is_system]);
        }
    }
    async down(queryRunner) {
    }
}
exports.RefreshRolePermissions1781957702482 = RefreshRolePermissions1781957702482;
//# sourceMappingURL=1781957702482-018-refresh-role-permissions.js.map