import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hajj service — data-driven requirements. Creates hajj_requirements (the CMS
 * replacement for the hardcoded array the public page shipped with) and seeds
 * the four current items with their existing en/rw/ar copy and RWF amounts, so
 * the page renders identically before an admin touches anything.
 *
 * The `registrationFee` and `advancePayment` keys are load-bearing: the
 * registration form reads its two amounts from them.
 */
export class HajjRequirements1786000000021 implements MigrationInterface {
  name = 'HajjRequirements1786000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hajj_requirements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL,
        "title_en" varchar(120) NOT NULL,
        "title_rw" varchar(120) NOT NULL DEFAULT '',
        "title_ar" varchar(120) NOT NULL DEFAULT '',
        "description_en" text NOT NULL DEFAULT '',
        "description_rw" text NOT NULL DEFAULT '',
        "description_ar" text NOT NULL DEFAULT '',
        "amount_rwf" integer,
        "mandatory" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "icon" varchar(40),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_hajj_requirements" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_hajj_requirement_key" ON "hajj_requirements" ("key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hajj_requirement_sort" ON "hajj_requirements" ("sort_order")`,
    );

    // key, titleEn, titleRw, titleAr, descEn, descRw, descAr, amountRwf, sort, icon
    const seed: [string, string, string, string, string, string, string, number | null, number, string][] = [
      [
        'passport',
        'Valid Passport',
        'Pasiporo ifite agaciro',
        'جواز سفر ساري',
        'Passport valid for at least 6 months beyond travel.',
        'Pasiporo igomba kugira nibura amezi 6 nyuma y’urugendo.',
        'جواز ساري لمدة 6 أشهر على الأقل بعد السفر.',
        null,
        0,
        'FileCheck2',
      ],
      [
        'registrationFee',
        'Registration Fee',
        'Amafaranga yo kwiyandikisha',
        'رسوم التسجيل',
        'Non-refundable fee to open your application.',
        'Amafaranga adasubizwa yo gufungura dosiye yawe.',
        'رسوم غير مستردة لفتح طلبك.',
        40000,
        1,
        'Receipt',
      ],
      [
        'advancePayment',
        'Initial Payment',
        'Ubwishyu bwa mbere',
        'الدفعة الأولية',
        'A portion of the full package cost to reserve your place.',
        'Igice cy’igiciro cyose cyo kubika umwanya wawe.',
        'جزء من التكلفة الكاملة لحجز مكانك.',
        400000,
        2,
        'Banknote',
      ],
      [
        'financialCapacity',
        'Financial Capacity',
        'Ubushobozi bw’amafaranga',
        'القدرة المالية',
        'Ability to cover the remaining cost of the journey.',
        'Ubushobozi bwo kwishyura igice gisigaye cy’urugendo.',
        'القدرة على تغطية التكلفة المتبقية للرحلة.',
        null,
        3,
        'Wallet',
      ],
    ];

    for (const [key, tEn, tRw, tAr, dEn, dRw, dAr, amount, sort, icon] of seed) {
      await queryRunner.query(
        `INSERT INTO "hajj_requirements"
           ("key","title_en","title_rw","title_ar",
            "description_en","description_rw","description_ar",
            "amount_rwf","mandatory","sort_order","icon")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10)`,
        [key, tEn, tRw, tAr, dEn, dRw, dAr, amount, sort, icon],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hajj_requirements"`);
  }
}
