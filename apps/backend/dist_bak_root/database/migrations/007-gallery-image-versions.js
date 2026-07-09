"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryImageVersions1700000000007 = void 0;
class GalleryImageVersions1700000000007 {
    constructor() {
        this.name = 'GalleryImageVersions1700000000007';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "gallery_items"
      ADD COLUMN IF NOT EXISTS "thumbnail_key" varchar(500),
      ADD COLUMN IF NOT EXISTS "medium_key" varchar(500)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "gallery_items"
      DROP COLUMN IF EXISTS "thumbnail_key",
      DROP COLUMN IF EXISTS "medium_key"
    `);
    }
}
exports.GalleryImageVersions1700000000007 = GalleryImageVersions1700000000007;
//# sourceMappingURL=007-gallery-image-versions.js.map