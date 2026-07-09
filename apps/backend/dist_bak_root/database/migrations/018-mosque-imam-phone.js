"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MosqueImamPhone1781957702484 = void 0;
class MosqueImamPhone1781957702484 {
    constructor() {
        this.name = 'MosqueImamPhone1781957702484';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_phone" varchar(20)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_phone"`);
    }
}
exports.MosqueImamPhone1781957702484 = MosqueImamPhone1781957702484;
//# sourceMappingURL=018-mosque-imam-phone.js.map