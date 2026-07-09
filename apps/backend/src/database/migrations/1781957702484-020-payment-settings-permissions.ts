import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds payment_settings permissions to the SuperAdmin and Admin roles.
 * Safe to re-run: uses jsonb_array_elements check to avoid duplicates.
 */
export class PaymentSettingsPermissions1781957702484 implements MigrationInterface {
  name = 'PaymentSettingsPermissions1781957702484';

  private readonly NEW_PERMISSIONS = ['payment_settings:view', 'payment_settings:manage'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const perm of this.NEW_PERMISSIONS) {
      // Append to SuperAdmin (all permissions)
      await queryRunner.query(
        `
        UPDATE "roles"
        SET "permissions" = "permissions" || $1::jsonb,
            "updated_at"  = now()
        WHERE "slug" IN ('superadmin', 'admin')
          AND NOT ("permissions" @> $1::jsonb)
      `,
        [JSON.stringify([perm])],
      );
    }

    // SuperAdmin gets both; Admin already included via loop above.
    // SMS / notification pattern: superadmin + admin can view & manage payment settings.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const perm of this.NEW_PERMISSIONS) {
      await queryRunner.query(
        `
        UPDATE "roles"
        SET "permissions" = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements("permissions") AS elem
          WHERE elem::text != $1
        ),
        "updated_at" = now()
        WHERE "slug" IN ('superadmin', 'admin')
      `,
        [JSON.stringify(perm)],
      );
    }
  }
}
