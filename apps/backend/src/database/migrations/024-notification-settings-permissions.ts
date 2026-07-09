import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationSettingsPermissions1782400000000 implements MigrationInterface {
  name = 'NotificationSettingsPermissions1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newPerms = ['notification_settings:view', 'notification_settings:manage'];

    for (const perm of newPerms) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(
            COALESCE(permissions, '[]'::jsonb) || $1::jsonb
          ) AS elem
        )
        WHERE name IN ('superadmin', 'admin')
      `,
        [JSON.stringify([perm])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permsToRemove = ['notification_settings:view', 'notification_settings:manage'];

    for (const perm of permsToRemove) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb)) AS elem
          WHERE elem::text != $1
        )
        WHERE name IN ('superadmin', 'admin')
      `,
        [JSON.stringify(perm)],
      );
    }
  }
}
