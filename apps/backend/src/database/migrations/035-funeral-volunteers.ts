import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — volunteers (attendants). Creates the table and seeds a
 * roster registered under real mosques (picked by name order).
 */
export class FuneralVolunteers1786000000008 implements MigrationInterface {
  name = 'FuneralVolunteers1786000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funeral_volunteers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "phone" varchar(30),
        "mosque_id" uuid NOT NULL,
        "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "available" boolean NOT NULL DEFAULT true,
        "assigned_task" varchar(30),
        "assigned_request_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_volunteers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_volunteer_mosque" ON "funeral_volunteers" ("mosque_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_volunteer_assigned_request" ON "funeral_volunteers" ("assigned_request_id")`);

    // Seed a roster, registering each under a real mosque (by name order).
    const seeds: [string, string, number, string][] = [
      ['Omar Nkurunziza', '+250 788 111 201', 0, '["ghusl","grave_digging"]'],
      ['Fatima Uwase', '+250 788 111 202', 0, '["family_assistance","documentation"]'],
      ['Bilal Ntaganda', '+250 788 111 203', 1, '["transportation","crowd_management"]'],
      ['Hassan Mugisha', '+250 788 111 204', 1, '["grave_digging","crowd_management"]'],
      ['Zainab Uwera', '+250 788 111 205', 2, '["family_assistance","ghusl"]'],
      ['Idris Habimana', '+250 788 111 206', 3, '["documentation","transportation"]'],
    ];
    for (const [name, phone, offset, skills] of seeds) {
      await queryRunner.query(
        `INSERT INTO "funeral_volunteers" ("name", "phone", "mosque_id", "skills")
         SELECT $1, $2, id, $3::jsonb FROM "mosques" ORDER BY "name" OFFSET $4 LIMIT 1`,
        [name, phone, skills, offset],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_volunteers"`);
  }
}
