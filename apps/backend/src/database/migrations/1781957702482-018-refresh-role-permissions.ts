import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data migration: refresh every system role's permissions column to match the
 * current Permission enum (apps/backend/src/common/types/permissions.enum.ts).
 *
 * Why: Previous migrations created the roles table and seeded base permissions,
 * but as new permission values were added to the enum the existing role rows in
 * production / staging databases were never updated. This migration brings every
 * role into sync with the full permission matrix used by the application.
 *
 * Safe to re-run: uses ON CONFLICT DO UPDATE so it is fully idempotent.
 * Roles that don't exist yet are inserted; existing rows get their permissions
 * column replaced with the authoritative set below.
 */
export class RefreshRolePermissions1781957702482 implements MigrationInterface {
  name = 'RefreshRolePermissions1781957702482';

  // ── Full permission enum values ────────────────────────────────────────────

  private readonly ALL_PERMISSIONS = [
    // Users
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'users:assign_role',
    // Roles
    'roles:view',
    'roles:create',
    'roles:edit',
    'roles:delete',
    // Members
    'members:view',
    'members:create',
    'members:edit',
    'members:delete',
    'members:approve',
    'members:id_card',
    // Mosques
    'mosques:view',
    'mosques:create',
    'mosques:edit',
    'mosques:delete',
    'mosques:manage_imams',
    // Prayer times
    'prayer_times:view',
    'prayer_times:manage',
    // Content
    'content:view',
    'content:create',
    'content:edit',
    'content:delete',
    // Finance
    'finance:view',
    'finance:manage',
    // Donations
    'donations:view',
    'donations:manage',
    // Schools
    'schools:view',
    'schools:manage',
    // Contact messages (inbox)
    'contact_messages:view',
    'contact_messages:manage',
    // Reports
    'reports:view',
    'reports:export',
    // Marriage
    'marriage:view',
    'marriage:manage',
    'marriage:approve',
    'marriage:assign_imam',
    'marriage:certificate',
    'marriage:reports',
    // System
    'system:settings',
    'audit_log:view',
  ];

  private readonly OPERATOR_PERMISSIONS = [
    'members:view',
    'members:create',
    'members:edit',
    'members:approve',
    'members:id_card',
    'mosques:view',
    'prayer_times:view',
    'content:view',
    'content:create',
    'content:edit',
    'reports:view',
  ];

  private readonly ADMIN_PERMISSIONS = [
    // Inherits all operator permissions
    ...this.OPERATOR_PERMISSIONS,
    // Additional admin permissions
    'members:delete',
    'mosques:create',
    'mosques:edit',
    'mosques:manage_imams',
    'prayer_times:manage',
    'content:delete',
    'finance:view',
    'donations:view',
    'donations:manage',
    'schools:view',
    'schools:manage',
    'contact_messages:view',
    'contact_messages:manage',
    'reports:export',
    'users:view',
    'users:create',
    'users:edit',
    'users:assign_role',
    'roles:view',
    'audit_log:view',
  ];

  private readonly MARRIAGE_OFFICER_PERMISSIONS = [
    'marriage:view',
    'marriage:manage',
    'marriage:approve',
    'marriage:assign_imam',
    'marriage:certificate',
    'marriage:reports',
    'members:view',
    'mosques:view',
    'content:view',
  ];

  private readonly MEMBER_PERMISSIONS = ['prayer_times:view', 'content:view'];

  // ── Roles to upsert ───────────────────────────────────────────────────────

  private readonly roles = [
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

  private resolvePermissions(key: string): string[] {
    switch (key) {
      case 'ALL':
        return this.ALL_PERMISSIONS;
      case 'ADMIN':
        return this.ADMIN_PERMISSIONS;
      case 'OPERATOR':
        return this.OPERATOR_PERMISSIONS;
      case 'MARRIAGE_OFFICER':
        return this.MARRIAGE_OFFICER_PERMISSIONS;
      case 'MEMBER':
        return this.MEMBER_PERMISSIONS;
      default:
        return [];
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const role of this.roles) {
      const perms = this.resolvePermissions(role.permissions);
      const permsJson = JSON.stringify(perms);

      await queryRunner.query(
        `
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
      `,
        [role.name, role.slug, role.description, permsJson, role.is_system],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Permissions are data, not schema — there is no safe automatic rollback.
    // To revert, re-run the previous seed or apply a corrective migration.
  }
}
