"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MosqueImamName1781957702480 = void 0;
class MosqueImamName1781957702480 {
    constructor() {
        this.name = 'MosqueImamName1781957702480';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_name" varchar(200)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_name"`);
    }
}
exports.MosqueImamName1781957702480 = MosqueImamName1781957702480;
//# sourceMappingURL=1781957702480-013-mosque-imam-name.js.map