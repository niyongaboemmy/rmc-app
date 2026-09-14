import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every Q&A entry a stable sequence number for staff to refer to.
 *
 * "Question 18" is how somebody asks a colleague to look at one. A UUID is not,
 * and a title is ambiguous the moment two entries start with the same words.
 *
 * ── Admin-facing only ────────────────────────────────────────────────────────
 *
 * This is NOT the reading order. The public listing is still newest-first, and
 * the number never reaches a public projection — it is an internal handle, in the
 * same way `origin` and `status` are.
 *
 * ── Every row gets one, not just admin-authored entries ──────────────────────
 *
 * A member's pending submission is the thing most likely to be discussed before
 * it is answered ("has anyone looked at 21 yet?"), so numbering only published
 * entries would miss the case that needs it most. The number is assigned on
 * insert and never reused: deleting 18 leaves a gap, which is correct — a number
 * that gets recycled stops identifying anything.
 *
 * Backfilled in creation order so the existing entries read as a history rather
 * than an arbitrary shuffle. `id` breaks ties, so a re-run cannot produce a
 * different assignment.
 */
export class DawahQuestionEntryNumber1790000000077 implements MigrationInterface {
  name = 'DawahQuestionEntryNumber1790000000077';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" ADD COLUMN IF NOT EXISTS "entry_number" integer`,
    );

    // Oldest entry becomes 1. Deleted rows are numbered too: they are still in the
    // table (soft delete), and skipping them would leave the sequence with holes
    // that look like data loss rather than deletions.
    await queryRunner.query(`
      UPDATE "dawah_questions" AS q
         SET "entry_number" = numbered.rn
        FROM (
          SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC, "id" ASC) AS rn
            FROM "dawah_questions"
        ) AS numbered
       WHERE q."id" = numbered."id"
         AND q."entry_number" IS NULL
    `);

    // NOT NULL only after the backfill, or the ALTER fails on the existing rows.
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" ALTER COLUMN "entry_number" SET NOT NULL`,
    );

    // The service computes MAX + 1 and retries on 23505. That retry is only correct
    // because this index exists: without it two admins saving at the same instant
    // would both read the same MAX and both succeed, and the number would stop
    // identifying one entry.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_dawah_questions_entry_number"
        ON "dawah_questions" ("entry_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_dawah_questions_entry_number"`);
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" DROP COLUMN IF EXISTS "entry_number"`,
    );
  }
}
