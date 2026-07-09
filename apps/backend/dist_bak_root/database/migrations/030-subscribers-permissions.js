"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscribersPermissions1783000000000 = void 0;
class SubscribersPermissions1783000000000 {
    constructor() {
        this.name = 'SubscribersPermissions1783000000000';
    }
    async up(queryRunner) {
        for (const perm of ['subscribers:view', 'subscribers:manage']) {
            await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb) || $1::jsonb) AS elem
        )
        WHERE slug IN ('superadmin', 'admin')
      `, [JSON.stringify([perm])]);
        }
    }
    async down(queryRunner) {
        for (const perm of ['subscribers:view', 'subscribers:manage']) {
            await queryRunner.query(`
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb)) AS elem
          WHERE elem::text != $1
        )
        WHERE slug IN ('superadmin', 'admin')
      `, [JSON.stringify(perm)]);
        }
    }
}
exports.SubscribersPermissions1783000000000 = SubscribersPermissions1783000000000;
//# sourceMappingURL=030-subscribers-permissions.js.map