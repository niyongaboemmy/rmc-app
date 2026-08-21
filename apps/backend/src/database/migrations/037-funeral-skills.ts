import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — data-driven attendant skills. Creates the funeral_skills
 * table and seeds the original six tasks. A volunteer's `skills` / `assignedTask`
 * hold skill `key`s, so the seed keys match the previous hardcoded task values.
 */
export class FuneralSkills1786000000010 implements MigrationInterface {
  name = 'FuneralSkills1786000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funeral_skills" (
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
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_funeral_skill_key" ON "funeral_skills" ("key")`);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_skill_sort" ON "funeral_skills" ("sort_order")`);

    const seed: [string, string, string, string, number][] = [
      ['ghusl', 'Ghusl', 'Koga umurambo', 'الغُسل', 0],
      ['transportation', 'Transportation', 'Gutwara', 'النقل', 1],
      ['grave_digging', 'Grave digging', 'Gucukura imva', 'حفر القبر', 2],
      ['crowd_management', 'Crowd management', 'Gucunga imbaga', 'تنظيم الحشود', 3],
      ['family_assistance', 'Family assistance', 'Gufasha umuryango', 'مساعدة الأسرة', 4],
      ['documentation', 'Documentation', 'Kwandika inyandiko', 'التوثيق', 5],
    ];
    for (const [key, en, rw, ar, sort] of seed) {
      await queryRunner.query(
        `INSERT INTO "funeral_skills" ("key","label_en","label_rw","label_ar","sort_order") VALUES ($1,$2,$3,$4,$5)`,
        [key, en, rw, ar, sort],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_skills"`);
  }
}
