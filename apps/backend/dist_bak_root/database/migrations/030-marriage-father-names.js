"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageFatherNames1786000000003 = void 0;
class MarriageFatherNames1786000000003 {
    constructor() {
        this.name = 'MarriageFatherNames1786000000003';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "groom_father_name" varchar(150),
      ADD COLUMN IF NOT EXISTS "bride_father_name" varchar(150)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "groom_father_name",
      DROP COLUMN IF EXISTS "bride_father_name"
    `);
    }
}
exports.MarriageFatherNames1786000000003 = MarriageFatherNames1786000000003;
//# sourceMappingURL=030-marriage-father-names.js.map