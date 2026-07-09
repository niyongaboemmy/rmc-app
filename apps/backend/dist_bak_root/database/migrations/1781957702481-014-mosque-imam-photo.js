"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MosqueImamPhoto1781957702481 = void 0;
class MosqueImamPhoto1781957702481 {
    constructor() {
        this.name = 'MosqueImamPhoto1781957702481';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_photo" text`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_photo"`);
    }
}
exports.MosqueImamPhoto1781957702481 = MosqueImamPhoto1781957702481;
//# sourceMappingURL=1781957702481-014-mosque-imam-photo.js.map