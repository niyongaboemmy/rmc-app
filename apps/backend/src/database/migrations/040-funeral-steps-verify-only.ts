import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Simplify the funeral request lifecycle to two steps: a report comes in
 * ("reported") and an admin verifies it ("verified"). Replaces the previous
 * multi-step seed and remaps any in-flight request that had progressed past
 * "reported" to "verified".
 */
export class FuneralStepsVerifyOnly1786000000013 implements MigrationInterface {
  name = 'FuneralStepsVerifyOnly1786000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "funeral_steps"`);
    await queryRunner.query(`
      INSERT INTO "funeral_steps"
        ("key","title_en","title_rw","title_ar","description_en","sort_order","is_active","color","icon") VALUES
        ('reported', 'Death reported', 'Urupfu rwamenyekanishijwe', 'تم الإبلاغ عن الوفاة', 'The death has been reported and is awaiting verification.', 0, true, '#64748b', 'FileText'),
        ('verified', 'Verified', 'Byemejwe', 'تم التحقق', 'The report has been verified by an administrator.', 1, true, '#16a34a', 'ShieldCheck')
    `);
    // Any request past the initial report becomes "verified".
    await queryRunner.query(`UPDATE "funeral_requests" SET "stage" = 'verified' WHERE "stage" <> 'reported'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "funeral_steps"`);
    const seed: [string, string, string, string, string, number, string, string][] = [
      ['reported', 'Death reported', 'Urupfu rwamenyekanishijwe', 'تم الإبلاغ عن الوفاة', 'The death has been reported to the committee and a case opened.', 0, '#64748b', 'FileText'],
      ['verification', 'Verification', 'Kugenzura', 'التحقق', 'Documents and details are verified before arrangements begin.', 1, '#6366f1', 'ShieldCheck'],
      ['family_contacted', 'Family contacted', 'Umuryango wamenyeshejwe', 'تم الاتصال بالأسرة', '', 2, '#0ea5e9', 'Phone'],
      ['ghusl', 'Ghusl scheduled', 'Ghusl yateganyijwe', 'تحديد موعد الغُسل', '', 3, '#06b6d4', 'Droplets'],
      ['kafan', 'Kafan prepared', 'Kafan yateguwe', 'تجهيز الكفن', '', 4, '#14b8a6', 'Package'],
      ['janazah', 'Janāzah prayer scheduled', 'Isengesho rya Janaza ryateganyijwe', 'تحديد موعد صلاة الجنازة', '', 5, '#8b5cf6', 'Users'],
      ['transportation', 'Transportation', 'Gutwara umurambo', 'النقل', '', 6, '#f59e0b', 'Truck'],
      ['burial', 'Burial', 'Ishyingura', 'الدفن', '', 7, '#0d3d24', 'Landmark'],
      ['completed', 'Completed', 'Byarangiye', 'اكتمل', '', 8, '#16a34a', 'CheckCircle2'],
    ];
    for (const [key, en, rw, ar, desc, sort, color, icon] of seed) {
      await queryRunner.query(
        `INSERT INTO "funeral_steps" ("key","title_en","title_rw","title_ar","description_en","sort_order","color","icon")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [key, en, rw, ar, desc, sort, color, icon],
      );
    }
  }
}
