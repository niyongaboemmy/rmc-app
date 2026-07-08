import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants funeral:view and funeral:manage to the roles that operate the funeral
 * service — superadmin and admin — mirroring the marriage/sms permission seeds.
 */
export class FuneralPermissions1786000000005 implements MigrationInterface {
  name = 'FuneralPermissions1786000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const slug of ['superadmin', 'admin']) {
      await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT val)
          FROM jsonb_array_elements_text(
            permissions || '["funeral:view","funeral:manage"]'::jsonb
          ) AS val
        ),
        updated_at = now()
        WHERE slug = $1
      `, [slug]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE val NOT IN ('funeral:view', 'funeral:manage')
      ),
      updated_at = now()
      WHERE slug IN ('superadmin', 'admin')
    `);
  }
}
