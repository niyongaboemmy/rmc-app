import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants job-applications admin permissions to superadmin and admin roles.
 * Safe to re-run: uses a @> check to avoid duplicate entries.
 * (Superadmin bypasses permission checks in code, but seeding keeps the
 * permission discoverable in the Roles & Permissions admin UI.)
 */
export class JobApplicationsPermissions1790000000041 implements MigrationInterface {
  name = 'JobApplicationsPermissions1790000000041';

  private readonly PERMS = ['job_applications:view', 'job_applications:manage'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const perm of this.PERMS) {
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
    for (const perm of this.PERMS) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements("permissions") AS elem
           WHERE elem::text != $1
         ),
         "updated_at" = now()
         WHERE "slug" IN ('superadmin', 'admin')`,
        [JSON.stringify(perm)],
      );
    }
  }
}
