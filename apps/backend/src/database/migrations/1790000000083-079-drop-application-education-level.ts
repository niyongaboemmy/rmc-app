import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops `scholarship_applications.education_level`.
 *
 * It was a required field that nothing asked for. The wizard stopped surfacing
 * it at some point and now sends a literal `'university'` for every applicant —
 * a "Fixed default for the two enums the new form no longer surfaces, so the
 * unchanged backend validation still passes", in its own words. So the column
 * held one hardcoded value written by the form, presented on two screens as
 * though it described the applicant.
 *
 * That is worse than absent. The admin review page showed it as "Level" beside
 * real facts about the case, and the public tracking page showed it to the
 * applicant with the reasoning that it "tells them they opened the right record"
 * — a field that is identical for everyone tells them nothing, and a reviewer
 * reading "University" about a secondary-school pupil is being actively
 * misinformed.
 *
 * ── Not to be confused with two fields that stay ─────────────────────────────
 *
 *   - `scholarship_programs.level` — the level an OFFER is aimed at, which is
 *     real, is chosen by an admin, and became CMS-managed in migration 078.
 *   - `member_profiles.education_level` — a different feature entirely.
 *
 * ── down() ───────────────────────────────────────────────────────────────────
 *
 * Restores the column, its NOT NULL and its CHECK, so the schema goes back
 * exactly. It cannot restore the values: the ones dropped here were a mix of
 * seeded fixtures and the wizard's constant, and inventing per-row levels to
 * refill it would be worse than the single honest default it uses instead.
 */
export class DropApplicationEducationLevel1790000000083 implements MigrationInterface {
  name = 'DropApplicationEducationLevel1790000000083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The CHECK constraint is dropped with the column it constrains.
    await queryRunner.query(`
      ALTER TABLE "scholarship_applications" DROP COLUMN IF EXISTS "education_level"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scholarship_applications"
        ADD COLUMN IF NOT EXISTS "education_level" varchar(20)
    `);
    // The value the wizard was writing for everyone anyway, which is the only
    // honest thing to put back.
    await queryRunner.query(`
      UPDATE "scholarship_applications" SET "education_level" = 'university'
       WHERE "education_level" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_applications"
        ALTER COLUMN "education_level" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_applications"
        DROP CONSTRAINT IF EXISTS "scholarship_applications_education_level_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_applications"
        ADD CONSTRAINT "scholarship_applications_education_level_check"
        CHECK (education_level IN ('secondary', 'tvet', 'university'))
    `);
  }
}
