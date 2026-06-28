import { MigrationInterface, QueryRunner } from 'typeorm';

const MAX_FILE_SIZE = 800 * 1024 * 1024; // 800 MB in bytes

export class UploadSettings1781957702512 implements MigrationInterface {
  name = 'UploadSettings1781957702512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the upload_settings table
    await queryRunner.query(`
      CREATE TABLE "upload_settings" (
        "id"                  UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "max_file_size"       BIGINT                   NOT NULL DEFAULT ${MAX_FILE_SIZE},
        "allowed_mime_types"  JSONB                    NOT NULL DEFAULT '[]'::jsonb,
        "created_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_upload_settings" PRIMARY KEY ("id")
      )
    `);

    // Seed the single default row:
    //   max_file_size  = 800 MB
    //   allowed_mime_types = [] (empty = all types allowed)
    await queryRunner.query(`
      INSERT INTO "upload_settings" ("max_file_size", "allowed_mime_types")
      VALUES (${MAX_FILE_SIZE}, '[]'::jsonb)
    `);

    // Grant UPLOAD_SETTINGS_VIEW/MANAGE to superadmin and admin roles
    for (const perm of ['upload_settings:view', 'upload_settings:manage']) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb,
             "updated_at"  = now()
         WHERE "slug" IN ('superadmin', 'admin')
           AND NOT ("permissions" @> $1::jsonb)`,
        [JSON.stringify([perm])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "upload_settings"`);

    for (const perm of ['upload_settings:view', 'upload_settings:manage']) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements("permissions") AS elem
           WHERE elem::text != $1
         ),
         "updated_at" = now()
         WHERE "slug" IN ('superadmin', 'admin')`,
        [JSON.stringify(perm)],
      );
    }
  }
}
