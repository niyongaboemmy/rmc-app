import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — data-driven lifecycle steps. Creates the funeral_steps
 * table (the ordered active steps define the request lifecycle) and seeds the
 * original nine stages with accent colours + icons. A request's `stage` holds a
 * step `key`, so the seed keys match the previous hardcoded stage values.
 */
export class FuneralSteps1786000000009 implements MigrationInterface {
  name = 'FuneralSteps1786000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funeral_steps" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL,
        "title_en" varchar(120) NOT NULL,
        "title_rw" varchar(120) NOT NULL DEFAULT '',
        "title_ar" varchar(120) NOT NULL DEFAULT '',
        "description_en" text NOT NULL DEFAULT '',
        "description_rw" text NOT NULL DEFAULT '',
        "description_ar" text NOT NULL DEFAULT '',
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "color" varchar(20),
        "icon" varchar(40),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_steps" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_funeral_step_key" ON "funeral_steps" ("key")`);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_step_sort" ON "funeral_steps" ("sort_order")`);

    const seed: [string, string, string, string, string, number, string, string][] = [
      // key, en, rw, ar, descriptionEn, sort, color, icon
      ['reported', 'Death reported', 'Urupfu rwamenyekanishijwe', 'تم الإبلاغ عن الوفاة', 'The death has been reported to the committee and a case opened.', 0, '#64748b', 'FileText'],
      ['verification', 'Verification', 'Kugenzura', 'التحقق', 'Documents and details are verified before arrangements begin.', 1, '#6366f1', 'ShieldCheck'],
      ['family_contacted', 'Family contacted', 'Umuryango wamenyeshejwe', 'تم الاتصال بالأسرة', 'The family has been reached to confirm wishes and next steps.', 2, '#0ea5e9', 'Phone'],
      ['ghusl', 'Ghusl scheduled', 'Ghusl yateganyijwe', 'تحديد موعد الغُسل', 'The ritual washing (ghusl) of the deceased is arranged.', 3, '#06b6d4', 'Droplets'],
      ['kafan', 'Kafan prepared', 'Kafan yateguwe', 'تجهيز الكفن', 'The shrouding (kafan) of the deceased is prepared.', 4, '#14b8a6', 'Package'],
      ['janazah', 'Janāzah prayer scheduled', 'Isengesho rya Janaza ryateganyijwe', 'تحديد موعد صلاة الجنازة', 'The funeral prayer (janāzah) time and mosque are set.', 5, '#8b5cf6', 'Users'],
      ['transportation', 'Transportation', 'Gutwara umurambo', 'النقل', 'Transport of the deceased to the cemetery is organised.', 6, '#f59e0b', 'Truck'],
      ['burial', 'Burial', 'Ishyingura', 'الدفن', 'The burial takes place according to Islamic rites.', 7, '#0d3d24', 'Landmark'],
      ['completed', 'Completed', 'Byarangiye', 'اكتمل', 'All arrangements are complete. May Allah grant them mercy.', 8, '#16a34a', 'CheckCircle2'],
    ];
    for (const [key, en, rw, ar, desc, sort, color, icon] of seed) {
      await queryRunner.query(
        `INSERT INTO "funeral_steps" ("key","title_en","title_rw","title_ar","description_en","sort_order","color","icon")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [key, en, rw, ar, desc, sort, color, icon],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_steps"`);
  }
}
