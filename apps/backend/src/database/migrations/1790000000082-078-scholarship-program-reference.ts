import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The programme reference stops being something an admin types.
 *
 * `reference_number` was a free-text box with `RMC-SCHP-2607-0001` as a
 * placeholder and nothing enforcing it: no format, no uniqueness, no generation.
 * Two of the three live programmes had none at all, and two could have carried
 * the same one — which is not much of a citation for a field whose entire job is
 * to identify a programme in correspondence.
 *
 * It is now allocated server-side, like `application_number` beside it:
 *
 *     RMC-SCHP-<YYMM>-<4-digit sequence>
 *
 * ── Why a sequence and not a count ───────────────────────────────────────────
 *
 * `SELECT count(*) + 1` is the obvious version and it is wrong under
 * concurrency: two admins creating a programme in the same instant both read the
 * same count and both write the same reference. A Postgres sequence hands out
 * each value exactly once, and does so outside the transaction, so a rolled-back
 * create burns a number rather than reissuing one. A gap in the numbering is not
 * a defect; a duplicate reference is.
 *
 * ── The backfill ─────────────────────────────────────────────────────────────
 *
 * Rows without a reference get one, dated from `created_at` rather than today —
 * `RMC-SCHP-2607-0002` for something written last July says something true,
 * where today's month would not.
 *
 * The one hand-typed reference already in the data is KEPT. It is what RMC has
 * used in whatever correspondence already went out, and renumbering it to suit a
 * new scheme would break the only thing it is for. The sequence simply starts
 * above it.
 */
export class ScholarshipProgramReference1790000000082 implements MigrationInterface {
  name = 'ScholarshipProgramReference1790000000082';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS scholarship_program_seq`);

    // Start above anything already typed in, so a backfilled row can never
    // collide with a reference RMC has already used. Only our own format is
    // considered — a free-text field may hold anything, and "RMC-2026/07" is not
    // a number to count from.
    const [{ max }]: [{ max: string | null }] = await queryRunner.query(`
      SELECT MAX(NULLIF(regexp_replace(reference_number, '^RMC-SCHP-\\d{4}-(\\d{4})$', '\\1'), reference_number)::int) AS max
      FROM scholarship_programs
      WHERE reference_number ~ '^RMC-SCHP-\\d{4}-\\d{4}$'
    `);
    // The third argument is `is_called`: true means "this value has been used,
    // hand out the next one", false means "hand out this value". So an existing
    // max of 1 seeds (1, true) and the next reference is 0002; nothing existing
    // seeds (1, false) and the first reference is 0001.
    await queryRunner.query(`SELECT setval('scholarship_program_seq', $1, $2)`, [
      max == null ? 1 : Number(max),
      max != null,
    ]);

    const rows: { id: string }[] = await queryRunner.query(`
      SELECT id FROM scholarship_programs
      WHERE reference_number IS NULL OR btrim(reference_number) = ''
      ORDER BY created_at
    `);
    for (const row of rows) {
      await queryRunner.query(
        `UPDATE scholarship_programs
            SET reference_number =
              'RMC-SCHP-' || to_char(created_at, 'YYMM') || '-' ||
              lpad(nextval('scholarship_program_seq')::text, 4, '0')
          WHERE id = $1`,
        [row.id],
      );
    }

    // Partial, and it includes soft-deleted rows on purpose: a deleted
    // programme's reference must not be reissued while the correspondence
    // quoting it still exists.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_scholarship_programs_reference"
        ON "scholarship_programs" ("reference_number")
        WHERE "reference_number" IS NOT NULL
    `);

    /*
     * The education levels move into the CMS, so the database stops holding a
     * closed list of them.
     *
     * Migration 028 pinned `level` to secondary/tvet/university with a CHECK.
     * That was right while the list was an enum in code; it is wrong now that an
     * admin defines the levels, because the first one they add makes every save
     * fail — as a 500, since a CHECK violation is not something the validation
     * layer can turn into a message. The column keeps its varchar(20) bound,
     * which is what the DTO validates against.
     *
     * `scholarship_applications.education_level` keeps ITS check. That field
     * describes the applicant rather than the offer, is still a code-level enum,
     * and nothing in this change touches it.
     */
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        DROP CONSTRAINT IF EXISTS "scholarship_programs_level_check"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /*
     * Restoring the CHECK would fail on any programme using a level added since,
     * so the rows that would violate it are cleared first. That loses which
     * level those programmes were at — but the alternative is a `down()` that
     * throws and leaves the schema half-reverted, and the levels it cannot
     * express are exactly the ones this migration existed to allow.
     */
    await queryRunner.query(`
      UPDATE "scholarship_programs"
         SET "level" = NULL
       WHERE "level" IS NOT NULL
         AND "level" NOT IN ('secondary', 'tvet', 'university')
    `);
    // Dropped first so this is safe to run whatever state the constraint is in —
    // including against a database where an earlier version of this migration's
    // `up()` had not yet learned to remove it.
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        DROP CONSTRAINT IF EXISTS "scholarship_programs_level_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        ADD CONSTRAINT "scholarship_programs_level_check"
        CHECK (level IS NULL OR level IN ('secondary', 'tvet', 'university'))
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_programs_reference"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS scholarship_program_seq`);
    // Backfilled references are NOT cleared: they may already have been quoted
    // somewhere, and a column that was nullable before is nullable still.
  }
}
