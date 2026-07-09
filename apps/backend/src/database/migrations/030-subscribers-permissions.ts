import { MigrationInterface, QueryRunner } from 'typeorm';

/** Grant subscriber permissions to the superadmin & admin roles. */
export class SubscribersPermissions1783000000000 implements MigrationInterface {
  name = 'SubscribersPermissions1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const perm of ['subscribers:view', 'subscribers:manage']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb) || $1::jsonb) AS elem
        )
        WHERE slug IN ('superadmin', 'admin')
      `,
        [JSON.stringify([perm])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const perm of ['subscribers:view', 'subscribers:manage']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb)) AS elem
          WHERE elem::text != $1
        )
        WHERE slug IN ('superadmin', 'admin')
      `,
        [JSON.stringify(perm)],
      );
    }
  }
}
