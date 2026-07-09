"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageBirthDates1786000000002 = void 0;
class MarriageBirthDates1786000000002 {
    constructor() {
        this.name = 'MarriageBirthDates1786000000002';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "groom_birth_date" date,
      ADD COLUMN IF NOT EXISTS "bride_birth_date" date
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "groom_birth_date",
      DROP COLUMN IF EXISTS "bride_birth_date"
    `);
    }
}
exports.MarriageBirthDates1786000000002 = MarriageBirthDates1786000000002;
//# sourceMappingURL=029-marriage-birth-dates.js.map