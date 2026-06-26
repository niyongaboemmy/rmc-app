import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants ai_settings:view and ai_settings:manage to the roles that may configure
 * the AI assistant: superadmin and admin. All other roles get nothing (least-privilege).
 */
export class AiSettingsPermissions1786000000001 implements MigrationInterface {
  name = 'AiSettingsPermissions1786000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const slug of ['superadmin', 'admin']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT val)
          FROM jsonb_array_elements_text(
            permissions || '["ai_settings:view","ai_settings:manage"]'::jsonb
          ) AS val
        ),
        updated_at = now()
        WHERE slug = $1
      `,
        [slug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE val NOT IN ('ai_settings:view', 'ai_settings:manage')
      ),
      updated_at = now()
    `);
  }
}
