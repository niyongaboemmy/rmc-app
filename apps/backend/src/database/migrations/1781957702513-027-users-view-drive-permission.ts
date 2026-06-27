import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersViewDrivePermission1781957702513 implements MigrationInterface {
  name = 'UsersViewDrivePermission1781957702513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = "permissions" || $1::jsonb,
           "updated_at"  = now()
       WHERE "slug" IN ('superadmin', 'admin')
         AND NOT ("permissions" @> $1::jsonb)`,
      [JSON.stringify(['users:view_drive'])],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = (
         SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
         FROM jsonb_array_elements("permissions") AS elem
         WHERE elem::text != $1
       ),
       "updated_at" = now()
       WHERE "slug" IN ('superadmin', 'admin')`,
      [JSON.stringify('users:view_drive')],
    );
  }
}
