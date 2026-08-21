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

    const LEGACY_TITLE = 'General Scholarship Applications (pre-2026)';

    // Looked up before inserting: a previous attempt at this migration can have
    // created the bucket and then rolled back for an unrelated reason, and on a
    // deployment that runs migrations outside a single transaction that row
    // survives. Inserting blindly would leave two buckets and split the history
    // across them.
    const existingBucket: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM scholarship_programs WHERE title = $1 AND slug IS NULL LIMIT 1`,
      [LEGACY_TITLE],
    );
    let legacyProgramId: string | null = existingBucket[0]?.id ?? null;

    if (Number(orphans[0].count) > 0) {
      if (!legacyProgramId) {
        // Created only when it is actually needed — a clean database should not
        // acquire a placeholder scholarship it never had a use for.
        const inserted: Array<{ id: string }> = await queryRunner.query(
          `
          INSERT INTO scholarship_programs
            (title, description, status, is_open, slug)
          VALUES (
            $1,
            'Applications filed before scholarships were announced individually. Retained so historical records stay visible in the admin console; never published.',
            'closed', false, NULL
          )
          RETURNING id
        `,
          [LEGACY_TITLE],
        );
        legacyProgramId = inserted[0].id;
      }

      await queryRunner.query(
        `UPDATE scholarship_applications SET program_id = $1 WHERE program_id IS NULL`,
        [legacyProgramId],
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
     *
     * The legacy bucket is exempt, and has to be. Every orphan above was just
     * collapsed into that one synthetic program, so an applicant who filed two
     * applications back when there was nothing to file them against now holds two
     * rows with an identical (applicant_id, program_id) pair. Building the index
     * over them fails outright —
     *
     *   could not create unique index "IDX_scholarship_app_one_per_program"
     *   DETAIL: Key (applicant_id, program_id)=(…) is duplicated.
     *
     * — and because TypeORM runs the whole batch in one transaction by default,
     * that takes every other pending migration down with it.
     *
     * Cancelling the older duplicates to force them through would be rewriting
     * applicants' history to satisfy a rule that did not exist when they applied.
     * The rule is forward-looking: it constrains applications to real
     * scholarships, which is the only place the wizard can now file them.
     */
    const liveStatuses = `"status" NOT IN ('cancelled', 'rejected')`;
    const scope = legacyProgramId
      ? `${liveStatuses} AND "program_id" <> '${legacyProgramId}'::uuid`
      : liveStatuses;

    /*
     * Checked before building the index rather than after failing to. Postgres
     * reports a duplicate key and one example pair, which says nothing about how
     * widespread the problem is, and the failure arrives with every other pending
     * migration already rolled back. This names the offenders while there is still
     * a readable log to put them in.
     */
    const collisions: Array<{ applicant_id: string; program_id: string; n: string }> =
      await queryRunner.query(`
        SELECT "applicant_id", "program_id", COUNT(*)::text AS n
          FROM "scholarship_applications"
         WHERE ${scope}
      GROUP BY "applicant_id", "program_id"
        HAVING COUNT(*) > 1
      `);

    if (collisions.length > 0) {
      const sample = collisions
        .slice(0, 5)
        .map((c) => `applicant ${c.applicant_id} × program ${c.program_id} (${c.n} live)`)
        .join('; ');
      throw new Error(
        `Cannot enforce one live application per scholarship: ${collisions.length} ` +
          `applicant/scholarship pair(s) already have more than one. ${sample}` +
          (collisions.length > 5 ? ' …' : '') +
          '. Resolve these (cancel or reject the superseded applications) before re-running.',
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_scholarship_app_one_per_program"
        ON "scholarship_applications" ("applicant_id", "program_id")
        WHERE ${scope}
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
