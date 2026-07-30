import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4: makes "every application belongs to a scholarship" a database
 * guarantee rather than a convention the service layer happens to follow.
 *
 * ── The orphans have to go somewhere first ───────────────────────────────────
 *
 * `program_id` was nullable and, in practice, always null — the wizard's program
 * picker had been removed, so every application ever filed points at nothing.
 * Those rows cannot simply be failed into NOT NULL.
 *
 * They are attached to a single synthetic scholarship instead: closed, and
 * deliberately WITHOUT a slug, so it can never be reached publicly (the public
 * lookup resolves by slug, and the list filters on status). The alternative —
 * leaving the column nullable and enforcing it only in the DTO — leaves a null
 * check in every consumer forever and no guarantee at all.
 *
 * Run this ONLY after the bound wizard is deployed. While an older frontend is
 * still live it can create fresh orphans, and this migration would then be
 * fixing a set that is still growing.
 */
export class ScholarshipApplicationProgramRequired1790000000058 implements MigrationInterface {
  name = 'ScholarshipApplicationProgramRequired1790000000058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orphans: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM scholarship_applications WHERE program_id IS NULL`,
    );

    if (Number(orphans[0].count) > 0) {
      // Created only when it is actually needed — a clean database should not
      // acquire a placeholder scholarship it never had a use for.
      const inserted: Array<{ id: string }> = await queryRunner.query(`
        INSERT INTO scholarship_programs
          (title, description, status, is_open, slug)
        VALUES (
          'General Scholarship Applications (pre-2026)',
          'Applications filed before scholarships were announced individually. Retained so historical records stay visible in the admin console; never published.',
          'closed', false, NULL
        )
        RETURNING id
      `);
      await queryRunner.query(
        `UPDATE scholarship_applications SET program_id = $1 WHERE program_id IS NULL`,
        [inserted[0].id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" ALTER COLUMN "program_id" SET NOT NULL`,
    );

    // The original schema (migration 028) already declared a foreign key on this
    // column as `FK_scholarship_applications_program`. Adding a second one under
    // a different name enforces nothing extra and leaves two constraints doing
    // identical work, so add one only if none exists.
    const existingFk: Array<{ conname: string }> = await queryRunner.query(`
      SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.conrelid = 'scholarship_applications'::regclass
         AND c.contype  = 'f'
         AND a.attname  = 'program_id'
    `);
    if (existingFk.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "scholarship_applications"
          ADD CONSTRAINT "FK_scholarship_app_program"
          FOREIGN KEY ("program_id") REFERENCES "scholarship_programs"("id")
      `);
    }

    /*
     * One LIVE application per person per scholarship.
     *
     * Partial on purpose: a withdrawn or rejected applicant must be able to
     * apply again, and a full unique index would lock them out permanently.
     * Applying to several DIFFERENT scholarships at once stays allowed — the
     * index is keyed on the pair.
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_scholarship_app_one_per_program"
        ON "scholarship_applications" ("applicant_id", "program_id")
        WHERE "status" NOT IN ('cancelled', 'rejected')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_app_one_per_program"`);
    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" DROP CONSTRAINT IF EXISTS "FK_scholarship_app_program"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scholarship_applications" ALTER COLUMN "program_id" DROP NOT NULL`,
    );
    // The synthetic scholarship is left in place: its applications still point
    // at it, and deleting it would orphan them all over again.
  }
}
