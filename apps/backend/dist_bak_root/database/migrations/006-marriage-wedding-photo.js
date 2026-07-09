"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageWeddingPhoto1700000000006 = void 0;
class MarriageWeddingPhoto1700000000006 {
    constructor() {
        this.name = 'MarriageWeddingPhoto1700000000006';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "wedding_photo_url" varchar(500)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "wedding_photo_url"
    `);
    }
}
exports.MarriageWeddingPhoto1700000000006 = MarriageWeddingPhoto1700000000006;
//# sourceMappingURL=006-marriage-wedding-photo.js.map