"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTwoFactor1782600000000 = void 0;
class UserTwoFactor1782600000000 {
    constructor() {
        this.name = 'UserTwoFactor1782600000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_enabled"
    `);
    }
}
exports.UserTwoFactor1782600000000 = UserTwoFactor1782600000000;
//# sourceMappingURL=026-user-two-factor.js.map