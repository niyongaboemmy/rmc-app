"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSettingsPermissions1781957702484 = void 0;
class PaymentSettingsPermissions1781957702484 {
    constructor() {
        this.name = 'PaymentSettingsPermissions1781957702484';
        this.NEW_PERMISSIONS = [
            'payment_settings:view',
            'payment_settings:manage',
        ];
    }
    async up(queryRunner) {
        for (const perm of this.NEW_PERMISSIONS) {
            await queryRunner.query(`
        UPDATE "roles"
        SET "permissions" = "permissions" || $1::jsonb,
            "updated_at"  = now()
        WHERE "slug" IN ('superadmin', 'admin')
          AND NOT ("permissions" @> $1::jsonb)
      `, [JSON.stringify([perm])]);
        }
    }
    async down(queryRunner) {
        for (const perm of this.NEW_PERMISSIONS) {
            await queryRunner.query(`
        UPDATE "roles"
        SET "permissions" = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements("permissions") AS elem
          WHERE elem::text != $1
        ),
        "updated_at" = now()
        WHERE "slug" IN ('superadmin', 'admin')
      `, [JSON.stringify(perm)]);
        }
    }
}
exports.PaymentSettingsPermissions1781957702484 = PaymentSettingsPermissions1781957702484;
//# sourceMappingURL=1781957702484-020-payment-settings-permissions.js.map