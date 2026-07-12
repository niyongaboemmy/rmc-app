import { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSIONS = [
  'hajj:view',
  'hajj:manage',
  'hajj:approve',
  'good_conduct:view',
  'good_conduct:manage',
  'good_conduct:approve',
  'good_conduct:certificate',
  'good_conduct:reports',
];

/**
 * Grants the hajj and good_conduct permissions to superadmin and admin.
 *
 * Neither set was ever granted to any role:
 *
 *  - 045-hajj-tables matched on `WHERE name IN ('superadmin', 'admin')`, but
 *    those are the values of roles.slug — roles.name holds 'Super Admin' and
 *    'Admin'. The UPDATE matched zero rows and failed silently.
 *  - The good-conduct migrations never granted role permissions at all.
 *
 * Superadmin was unaffected because PermissionsGuard short-circuits on
 * `user.role === 'superadmin'` before it ever reads the permission list, which
 * is why this went unnoticed: the admin role could not open /admin/hajj or
 * /admin/good-conduct at all.
 *
 * Matches on slug, like 032-funeral-permissions (the one that worked).
 */
export class FixHajjGoodConductPermissions1786000000022
  implements MigrationInterface
{
  name = 'FixHajjGoodConductPermissions1786000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const slug of ['superadmin', 'admin']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT val)
          FROM jsonb_array_elements_text(
            COALESCE(permissions, '[]'::jsonb) || $2::jsonb
          ) AS val
        ),
        updated_at = now()
        WHERE slug = $1
      `,
        [slug, JSON.stringify(PERMISSIONS)],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE NOT (val = ANY($1::text[]))
      ),
      updated_at = now()
      WHERE slug IN ('superadmin', 'admin')
    `,
      [PERMISSIONS],
    );
  }
}
