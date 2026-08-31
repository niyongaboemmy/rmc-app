import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the community-forum model that Dawah Q&A no longer runs on.
 *
 * Migration 054 built a forum: members asked, members answered, the community voted, and
 * a scholar marked one answer authoritative. That was reversed before launch — RMC writes
 * both halves of an entry now, a member's only action is to ask, and the answer lives in
 * `dawah_questions.answer_body`. The public controller has said so in a comment for
 * months: "there is nothing here for a member to answer, vote on or report."
 *
 * So three tables have been carrying a design nobody implements. No service ever injected
 * their repositories; the entities existed only to be registered in a TypeORM
 * `forFeature` array. Leaving them costs more than disk: every reader of this schema has
 * to work out which of the two answer models is the live one, and the honest answer was
 * "the one that is not in these tables".
 *
 * ── What goes ───────────────────────────────────────────────────────────────────────
 *
 *   dawah_answers   — 8 rows, against 3 questions that ALL carry an inline answer_body.
 *                     Nothing is lost that the live model does not already hold.
 *   dawah_votes     — 0 rows. Voting was never exposed.
 *   dawah_reports   — 0 rows. Reporting was never exposed.
 *
 * `dawah_moderation_log` STAYS. It records status changes on questions and is live.
 *
 * ── The down path ───────────────────────────────────────────────────────────────────
 *
 * Recreates all three empty, with their constraints and indexes intact, so a revert
 * restores the schema exactly. It cannot restore the 8 answer rows — they are dropped
 * with the table. That is deliberate rather than an oversight: they duplicate answers
 * already published on their questions, and a revert that resurrected them would put two
 * answers on the same entry.
 */
export class DropDawahForumTables1790000000068 implements MigrationInterface {
  name = 'DropDawahForumTables1790000000068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Votes first: they FK into answers.
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_answers"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dawah_answers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "body" text NOT NULL,
        "author_id" uuid NOT NULL,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'pending_review',
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_by_id" uuid,
        "verified_at" timestamptz,
        "released_by_id" uuid,
        "vote_score" int NOT NULL DEFAULT 0,
        "report_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_answers" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_dawah_answers_status" CHECK ("status" IN ('pending_review','published','auto_hidden','hidden','deleted')),
        CONSTRAINT "CHK_dawah_answers_verified_has_actor" CHECK (NOT "is_verified" OR "verified_at" IS NOT NULL),
        CONSTRAINT "CHK_dawah_answers_verified_published" CHECK (NOT "is_verified" OR "status" = 'published'),
        CONSTRAINT "FK_dawah_answers_question" FOREIGN KEY ("question_id") REFERENCES "dawah_questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_answers_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_dawah_answers_verified_by" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_dawah_answers_released_by" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_dawah_answers_question_status" ON "dawah_answers" ("question_id", "status")`);
    // Partial unique index — the "one verified answer per question" rule.
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_dawah_answers_one_verified" ON "dawah_answers" ("question_id") WHERE "is_verified"`);

    await queryRunner.query(`
      CREATE TABLE "dawah_votes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "answer_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "value" smallint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_votes" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_dawah_votes_value" CHECK ("value" IN (-1, 1)),
        CONSTRAINT "UQ_dawah_votes_one_per_user" UNIQUE ("answer_id", "user_id"),
        CONSTRAINT "FK_dawah_votes_answer" FOREIGN KEY ("answer_id") REFERENCES "dawah_answers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_votes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "dawah_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "target_type" varchar(20) NOT NULL,
        "target_id" uuid NOT NULL,
        "reporter_id" uuid NOT NULL,
        "reason" varchar(40) NOT NULL,
        "note" text NOT NULL DEFAULT '',
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "handled_by_id" uuid,
        "handled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_reports" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_dawah_reports_target" CHECK ("target_type" IN ('question','answer')),
        CONSTRAINT "CHK_dawah_reports_status" CHECK ("status" IN ('open','actioned','dismissed')),
        CONSTRAINT "UQ_dawah_reports_one_per_user" UNIQUE ("target_type", "target_id", "reporter_id"),
        CONSTRAINT "FK_dawah_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_reports_handled_by" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_dawah_reports_status_created" ON "dawah_reports" ("status", "created_at")`);
  }
}
