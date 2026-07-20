import { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSIONS = ['dawah:view', 'dawah:manage'];

/**
 * Grants the Dawah Learning permissions to superadmin and admin.
 *
 * Pairs with 052-dawah-tables. The seed (02-roles-admin) covers a fresh
 * database; this covers every database that already exists, which the seed
 * would only reach on a re-run.
 *
 * Matches on `roles.slug`, NOT `roles.name`. This is the whole point of the
 * migration it copies: 045-hajj-tables wrote `WHERE name IN ('superadmin',
 * 'admin')`, but those are slug values — roles.name holds 'Super Admin' and
 * 'Admin'. The UPDATE matched zero rows and failed silently, and nobody
 * noticed because PermissionsGuard short-circuits on `user.role ===
 * 'superadmin'` before it reads the list. Only the admin role was broken, and
 * only when an admin tried to open the page. 049 fixed it; this follows 049.
 *
 * The jsonb_agg(DISTINCT …) merge is idempotent — re-running adds nothing.
 */
export class DawahPermissions1786000000026 implements MigrationInterface {
  name = 'DawahPermissions1786000000026';

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
