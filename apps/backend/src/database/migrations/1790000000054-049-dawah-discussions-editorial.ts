import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns Dawah Discussions from a community forum into an editorial Q&A.
 *
 * ── The inversion ────────────────────────────────────────────────────────────────────
 *
 * Migration 054 built the opposite model, and said so: a question went live on submit and
 * could only be pulled BACK, while an answer was held for scholar review, "because a bad
 * question is noise, a bad answer is a false ruling someone acts on".
 *
 * RMC now authors the answers itself. That single change reverses the asymmetry — the
 * question becomes the thing held for review (it is not public until RMC has answered it),
 * and the answer needs no review at all, because RMC wrote it. Everything the old model
 * built around member-authored answers therefore loses its subject: voting has nothing to
 * rank when there is one answer, a "verified by RMC" badge is redundant when every answer
 * is RMC's, and reporting is an appeal to a moderator against content the moderators wrote.
 *
 * ── Why this migration does not drop anything ────────────────────────────────────────
 *
 * `dawah_answers`, `dawah_votes`, `dawah_reports` and `dawah_moderation_log` are left
 * standing, unread by the new code. The backfill below copies answers INTO the question
 * rows; if we dropped the source in the same breath, `down()` could recreate the empty
 * tables but never the rows, so the migration would be irreversible in practice while
 * looking reversible. A follow-up migration drops them once this model has proven itself
 * in production. Same reasoning leaves `dawah_categories.answer_policy` in place, inert.
 */
export class DawahDiscussionsEditorial1790000000054 implements MigrationInterface {
  name = 'DawahDiscussionsEditorial1790000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. The answer now lives on the question ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD COLUMN IF NOT EXISTS "answer_body"    text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "answered_by_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "answered_at"    timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "published_at"   timestamptz NULL
    `);

    // SET NULL, not CASCADE: if the scholar who wrote an answer is deleted, the answer
    // must survive — losing the attribution is acceptable, losing RMC's published ruling
    // because a staff account was removed is not.
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD CONSTRAINT "FK_dawah_questions_answered_by"
        FOREIGN KEY ("answered_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // ── 2. Backfill from the answers that already exist ────────────────────────────
    // The verified answer wins; failing that the newest published one. A question with no
    // published answer has nothing to show the public and becomes `pending`.
    await queryRunner.query(`
      UPDATE "dawah_questions" q
      SET "answer_body"    = a."body",
          "answered_by_id" = a."author_id",
          "answered_at"    = COALESCE(a."verified_at", a."created_at"),
          "published_at"   = q."created_at"
      FROM (
        SELECT DISTINCT ON ("question_id")
               "question_id", "body", "author_id", "verified_at", "created_at"
        FROM "dawah_answers"
        WHERE "status" = 'published' AND "deleted_at" IS NULL
        ORDER BY "question_id", "is_verified" DESC, "created_at" DESC
      ) a
      WHERE a."question_id" = q."id"
    `);

    // ── 3. The new status vocabulary ───────────────────────────────────────────────
    // Order matters: the CHECK has to go before rows can be moved to values it forbids.
    await queryRunner.query(`
      ALTER TABLE "dawah_questions" DROP CONSTRAINT IF EXISTS "CHK_dawah_questions_status"
    `);

    // Anything that was publicly visible but has no answer is now unpublished — it was
    // only public under the old rule that questions go live on submit.
    await queryRunner.query(`
      UPDATE "dawah_questions"
      SET "status" = CASE
        WHEN "status" IN ('published', 'auto_hidden', 'locked') AND "answer_body" <> ''
          THEN 'published'
        WHEN "status" IN ('published', 'auto_hidden', 'locked')
          THEN 'pending'
        ELSE "status"
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD CONSTRAINT "CHK_dawah_questions_status"
        CHECK ("status" IN ('pending', 'published', 'rejected', 'hidden', 'deleted'))
    `);

    // A published entry with no answer is the one state this model must never store:
    // it is exactly the old behaviour leaking back in.
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD CONSTRAINT "CHK_dawah_questions_published_has_answer"
        CHECK ("status" <> 'published' OR "answer_body" <> '')
    `);

    await queryRunner.query(`
      UPDATE "dawah_questions" SET "published_at" = COALESCE("published_at", "created_at")
      WHERE "status" = 'published'
    `);

    // ── 4. Columns whose subject no longer exists ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        DROP COLUMN IF EXISTS "verified_answer_id",
        DROP COLUMN IF EXISTS "answer_count",
        DROP COLUMN IF EXISTS "report_count",
        DROP COLUMN IF EXISTS "is_anonymous"
    `);

    // ── 5. Listing order is publication, not activity ──────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_status_activity"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_status_published"
        ON "dawah_questions" ("status", "published_at" DESC)
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_status_published"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dawah_questions_status_activity"
        ON "dawah_questions" ("status", "last_activity_at" DESC)
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD COLUMN IF NOT EXISTS "verified_answer_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "answer_count" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "report_count" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_anonymous" boolean NOT NULL DEFAULT false
    `);

    // dawah_answers was never dropped, so the counts and the verified pointer can be
    // rebuilt exactly rather than guessed at.
    await queryRunner.query(`
      UPDATE "dawah_questions" q
      SET "answer_count" = COALESCE(c.n, 0)
      FROM (
        SELECT "question_id", COUNT(*) n FROM "dawah_answers"
        WHERE "status" = 'published' AND "deleted_at" IS NULL GROUP BY "question_id"
      ) c
      WHERE c."question_id" = q."id"
    `);
    await queryRunner.query(`
      UPDATE "dawah_questions" q
      SET "verified_answer_id" = v."id"
      FROM (SELECT "id", "question_id" FROM "dawah_answers" WHERE "is_verified") v
      WHERE v."question_id" = q."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        DROP CONSTRAINT IF EXISTS "CHK_dawah_questions_published_has_answer"
    `);
    await queryRunner.query(`
      ALTER TABLE "dawah_questions" DROP CONSTRAINT IF EXISTS "CHK_dawah_questions_status"
    `);
    // 'pending' and 'rejected' have no pre-049 equivalent. They become 'hidden': not
    // public, which is the half of their meaning the old vocabulary can express.
    await queryRunner.query(`
      UPDATE "dawah_questions" SET "status" = 'hidden'
      WHERE "status" IN ('pending', 'rejected')
    `);
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD CONSTRAINT "CHK_dawah_questions_status"
        CHECK ("status" IN ('published', 'auto_hidden', 'hidden', 'locked', 'deleted'))
    `);

    await queryRunner.query(`
      ALTER TABLE "dawah_questions" DROP CONSTRAINT IF EXISTS "FK_dawah_questions_answered_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        DROP COLUMN IF EXISTS "published_at",
        DROP COLUMN IF EXISTS "answered_at",
        DROP COLUMN IF EXISTS "answered_by_id",
        DROP COLUMN IF EXISTS "answer_body"
    `);
  }
}
