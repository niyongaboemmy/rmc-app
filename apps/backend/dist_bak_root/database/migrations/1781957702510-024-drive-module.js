"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveModule1781957702510 = void 0;
class DriveModule1781957702510 {
    constructor() {
        this.name = 'DriveModule1781957702510';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "drive_items" (
        "id"          UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "name"        CHARACTER VARYING(255)   NOT NULL,
        "type"        CHARACTER VARYING(10)    NOT NULL,
        "mime_type"   CHARACTER VARYING(255),
        "storage_key" CHARACTER VARYING(500),
        "size"        BIGINT,
        "parent_id"   UUID,
        "owner_id"    UUID                     NOT NULL,
        "is_trashed"  BOOLEAN                  NOT NULL DEFAULT false,
        "trashed_at"  TIMESTAMP WITH TIME ZONE,
        "is_starred"  BOOLEAN                  NOT NULL DEFAULT false,
        "color"       CHARACTER VARYING(7),
        "description" TEXT,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_drive_items" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_drive_items_parent_id" ON "drive_items" ("parent_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_drive_items_owner_id" ON "drive_items" ("owner_id")
    `);
        await queryRunner.query(`
      ALTER TABLE "drive_items"
        ADD CONSTRAINT "FK_drive_items_parent"
          FOREIGN KEY ("parent_id")
          REFERENCES "drive_items"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "drive_items"
        ADD CONSTRAINT "FK_drive_items_owner"
          FOREIGN KEY ("owner_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      CREATE TABLE "drive_shares" (
        "id"              UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "item_id"         UUID                     NOT NULL,
        "shared_with_id"  UUID                     NOT NULL,
        "shared_by_id"    UUID                     NOT NULL,
        "permission"      CHARACTER VARYING(10)    NOT NULL DEFAULT 'viewer',
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_drive_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_drive_shares_item_user" UNIQUE ("item_id", "shared_with_id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_drive_shares_item_id" ON "drive_shares" ("item_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_drive_shares_shared_with_id" ON "drive_shares" ("shared_with_id")
    `);
        await queryRunner.query(`
      ALTER TABLE "drive_shares"
        ADD CONSTRAINT "FK_drive_shares_item"
          FOREIGN KEY ("item_id")
          REFERENCES "drive_items"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "drive_shares"
        ADD CONSTRAINT "FK_drive_shares_shared_with"
          FOREIGN KEY ("shared_with_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "drive_shares"
        ADD CONSTRAINT "FK_drive_shares_shared_by"
          FOREIGN KEY ("shared_by_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_shares"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_items"`);
    }
}
exports.DriveModule1781957702510 = DriveModule1781957702510;
//# sourceMappingURL=1781957702510-024-drive-module.js.map