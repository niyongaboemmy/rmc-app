import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records WHERE an entry came from, instead of leaving it to be inferred.
 *
 * Two paths produce a row in `dawah_questions`. A scholar writes both halves at once
 * (`createEntry`), or a member submits a question and a scholar answers it later
 * (`submitQuestion` → `answerQuestion`). Until now the only way to tell them apart was
 * the coincidence that `createEntry` sets `author_id` and `answered_by_id` to the same
 * admin — a heuristic, not a fact, and one that quietly breaks the day anything reassigns
 * an answerer.
 *
 * It also made `author_id` mean two different things. On a member's entry it is the
 * person who asked; on a scholar's it is RMC filling a required column, because nobody
 * asked at all. The public API deals with that by never exposing an asker — which is
 * right for privacy, but leaves the distinction unavailable even to the admin queue that
 * needs it most.
 *
 * ── The backfill ────────────────────────────────────────────────────────────────────
 *
 * 'scholar' where an answerer exists and equals the author; 'member' otherwise. Verified
 * against the current 17 rows: 4 scholar-authored (author = answerer), 2 member-asked and
 * answered, 11 unanswered — and an unanswered row can only be a member's, since a
 * scholar's entry is answered at the moment it is created.
 *
 * ── Why the default is 'member' ─────────────────────────────────────────────────────
 *
 * Both writers set the column explicitly, so the default only catches a future path that
 * forgets. Of the two possible mistakes, labelling RMC's own writing as a member's
 * understates authorship; labelling a member's question as RMC's puts words in the
 * institution's mouth. The first is recoverable, the second is not.
 */
export class DawahQuestionOrigin1790000000070 implements MigrationInterface {
  name = 'DawahQuestionOrigin1790000000070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD COLUMN "origin" varchar(20) NOT NULL DEFAULT 'member',
        ADD CONSTRAINT "CHK_dawah_questions_origin"
          CHECK ("origin" IN ('scholar', 'member'))
    `);

    await queryRunner.query(`
      UPDATE "dawah_questions"
      SET "origin" = 'scholar'
      WHERE "answered_by_id" IS NOT NULL
        AND "author_id" = "answered_by_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        DROP CONSTRAINT IF EXISTS "CHK_dawah_questions_origin",
        DROP COLUMN IF EXISTS "origin"
    `);
  }
}
