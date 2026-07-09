import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants drive permissions to superadmin, admin (full + admin flag),
 * and the standard user/member role (personal drive only).
 * Safe to re-run: uses @> check to avoid duplicates.
 */
export class DrivePermissions1781957702511 implements MigrationInterface {
  name = 'DrivePermissions1781957702511';

  private readonly USER_PERMS = [
    'drive:view',
    'drive:create',
    'drive:edit',
    'drive:delete',
    'drive:share',
  ];

  private readonly ADMIN_EXTRA = ['drive:admin'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // All drive user permissions → superadmin, admin, user (member)
    for (const perm of this.USER_PERMS) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb,
             "updated_at"  = now()
         WHERE "slug" IN ('superadmin', 'admin', 'user')
           AND NOT ("permissions" @> $1::jsonb)`,
        [JSON.stringify([perm])],
      );
    }

    // Admin-level flag → superadmin and admin only
    for (const perm of this.ADMIN_EXTRA) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb,
             "updated_at"  = now()
         WHERE "slug" IN ('superadmin', 'admin')
           AND NOT ("permissions" @> $1::jsonb)`,
        [JSON.stringify([perm])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allDrivePerms = [...this.USER_PERMS, ...this.ADMIN_EXTRA];
    for (const perm of allDrivePerms) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements("permissions") AS elem
           WHERE elem::text != $1
         ),
         "updated_at" = now()
         WHERE "slug" IN ('superadmin', 'admin', 'user')`,
        [JSON.stringify(perm)],
      );
    }
  }
}
