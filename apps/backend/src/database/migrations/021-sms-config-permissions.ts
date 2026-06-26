import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds sms_config:view and sms_config:manage permissions to the system roles
 * that should be able to see or edit the SMS gateway configuration.
 *
 * - superadmin → both permissions (full access)
 * - admin      → both permissions (manages integrations)
 * - All other roles → no SMS config permissions (least-privilege)
 */
export class SmsConfigPermissions1782000000001 implements MigrationInterface {
  name = 'SmsConfigPermissions1782000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sms_config:view and sms_config:manage to superadmin
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(DISTINCT val)
        FROM jsonb_array_elements_text(
          permissions || '["sms_config:view","sms_config:manage"]'::jsonb
        ) AS val
      ),
      updated_at = now()
      WHERE slug = 'superadmin'
    `);

    // Add sms_config:view and sms_config:manage to admin
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT jsonb_agg(DISTINCT val)
        FROM jsonb_array_elements_text(
          permissions || '["sms_config:view","sms_config:manage"]'::jsonb
        ) AS val
      ),
      updated_at = now()
      WHERE slug = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the two permissions from all roles
    await queryRunner.query(`
      UPDATE roles
      SET permissions = (
        SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
        FROM jsonb_array_elements_text(permissions) AS val
        WHERE val NOT IN ('sms_config:view', 'sms_config:manage')
      ),
      updated_at = now()
    `);
  }
}
