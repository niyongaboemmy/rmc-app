import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Volunteers (attendants) and their skills were removed from the product —
 * drop both tables.
 */
export class DropFuneralVolunteersSkills1786000000012 implements MigrationInterface {
  name = 'DropFuneralVolunteersSkills1786000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_volunteers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_skills"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funeral_skills" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL,
        "label_en" varchar(120) NOT NULL,
        "label_rw" varchar(120) NOT NULL DEFAULT '',
        "label_ar" varchar(120) NOT NULL DEFAULT '',
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_skills" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funeral_volunteers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "phone" varchar(30),
        "mosque_id" uuid NOT NULL,
        "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "available" boolean NOT NULL DEFAULT true,
        "assigned_task" varchar(40),
        "assigned_request_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_volunteers" PRIMARY KEY ("id")
      )
    `);
  }
}
