import { MigrationInterface, QueryRunner } from 'typeorm';

/** Funeral announcements were removed from the product — drop the table. */
export class DropFuneralAnnouncements1786000000011 implements MigrationInterface {
  name = 'DropFuneralAnnouncements1786000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_announcements"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funeral_announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "age" int NOT NULL DEFAULT 0,
        "date_of_death" date,
        "janazah_location" varchar(200) NOT NULL,
        "prayer_time" timestamptz NOT NULL,
        "burial_location" varchar(200) NOT NULL,
        "verse" text,
        "photo_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_announcements" PRIMARY KEY ("id")
      )
    `);
  }
}
