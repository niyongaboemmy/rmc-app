import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dawah Community Discussions — the data foundation for a public Q&A where members ask
 * about religion and community life, the community answers, and RMC scholars mark the
 * answer that is authoritative (docs/dawah-discussions-implementation-plan.md §2).
 *
 * Five tables, plus one column on the existing `dawah_categories`. The taxonomy is
 * REUSED, not duplicated: a "Fiqh" question and a "Fiqh" course must mean the same Fiqh,
 * and two category lists that drift apart is a worse problem than one column that courses
 * and books simply never read.
 *
 * ── The constraints here are the design, not decoration ──────────────────────────────
 *
 * This is the first table set in the app that stores text written by an untrusted
 * stranger, and the first where two privileged users can act on the same row at the same
 * moment. Both of those are lost by a check in TypeScript:
 *
 *   · UQ_dawah_answers_one_verified — a PARTIAL unique index. Two scholars verifying
 *     different answers to the same question concurrently is a real race; a service-level
 *     "is there already a verified answer?" SELECT loses it every time.
 *   · UQ_dawah_votes_one_per_user   — the unique constraint IS the "one vote per person"
 *     rule. Nothing else enforces it.
 *   · UQ_dawah_reports_one_per_user — one report per person per item, so a single angry
 *     member cannot manufacture a moderation queue.
 *   · CHK_dawah_answers_verified_published — "verified but hidden" is incoherent; the DB
 *     refuses to represent it.
 *
 * ── answer_policy defaults to 'scholar_review' ON PURPOSE ───────────────────────────
 *
 * Opting a category OUT of scholar review is an explicit act. The failure mode of
 * forgetting is therefore "answers wait for a scholar", never "unvetted religious rulings
 * went live under RMC's logo". A category added in two years inherits caution.
 *
 * ── Questions have no 'pending_review' ──────────────────────────────────────────────
 *
 * Deliberate asymmetry (plan §0.1). A bad question is noise; a bad answer is a false
 * ruling someone acts on. Questions go live on submit and can only be pulled BACK.
 */
export class DawahDiscussions1786000000027 implements MigrationInterface {
  name = 'DawahDiscussions1786000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── dawah_categories.answer_policy ───────────────────────────────────────────────
    // Shared with courses and books — a mild coupling, accepted so there is one taxonomy.
    // They never read this column.
    await queryRunner.query(`
      ALTER TABLE "dawah_categories"
        ADD COLUMN "answer_policy" varchar(20) NOT NULL DEFAULT 'scholar_review',
        ADD CONSTRAINT "CHK_dawah_categories_answer_policy"
          CHECK ("answer_policy" IN ('scholar_review', 'open'))
    `);

    // Confirmed by RMC 16 July 2026 (plan §10-Q2). Everything not listed keeps the strict
    // default. Grammar cannot carry a ruling; jurisprudence, creed, family law and revert
    // practice can, so those stay under review.
    await queryRunner.query(`
      UPDATE "dawah_categories"
      SET "answer_policy" = 'open'
      WHERE "slug" IN ('arabic-language', 'seerah', 'hadith', 'quran-studies')
    `);

    // ── dawah_questions ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dawah_questions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(180) NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL DEFAULT '',
        "language" varchar(20) NOT NULL DEFAULT 'en',
        "category_id" uuid,
        "author_id" uuid NOT NULL,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'published',
        "answer_count" int NOT NULL DEFAULT 0,
        "report_count" int NOT NULL DEFAULT 0,
        "view_count" int NOT NULL DEFAULT 0,
        "verified_answer_id" uuid,
        "last_activity_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dawah_questions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dawah_questions_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_dawah_questions_category" FOREIGN KEY ("category_id")
          REFERENCES "dawah_categories"("id") ON DELETE SET NULL,
        -- RESTRICT, not CASCADE: plan §10-Q7 (what a member's "delete my account" does to
        -- their questions) is unanswered. Refusing the delete surfaces the question loudly
        -- instead of silently destroying a thread other members are reading.
        CONSTRAINT "FK_dawah_questions_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_dawah_questions_lang" CHECK ("language" IN ('en', 'rw', 'ar')),
        -- No 'pending_review' — see the header.
        CONSTRAINT "CHK_dawah_questions_status"
          CHECK ("status" IN ('published', 'auto_hidden', 'hidden', 'locked', 'deleted'))
      )
    `);
    // The default list: published, most recently active first.
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_status_activity"
        ON "dawah_questions" ("status", "last_activity_at" DESC)
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_questions_category" ON "dawah_questions" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_questions_author" ON "dawah_questions" ("author_id")`,
    );

    // ── dawah_answers ────────────────────────────────────────────────────────────────
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
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dawah_answers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_answers_question" FOREIGN KEY ("question_id")
          REFERENCES "dawah_questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_answers_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        -- Who verified / released is accountability. If the user is gone, the record of
        -- the act stays; only the attribution goes null.
        CONSTRAINT "FK_dawah_answers_verified_by" FOREIGN KEY ("verified_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_dawah_answers_released_by" FOREIGN KEY ("released_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_dawah_answers_status"
          CHECK ("status" IN ('pending_review', 'published', 'auto_hidden', 'hidden', 'deleted')),
        -- A verified answer that nobody can see is incoherent. Refuse to store it.
        CONSTRAINT "CHK_dawah_answers_verified_published"
          CHECK (NOT "is_verified" OR "status" = 'published'),
        -- Verification must name someone. "Verified by RMC" with no scholar behind it is
        -- an institution hiding behind itself.
        CONSTRAINT "CHK_dawah_answers_verified_has_actor"
          CHECK (NOT "is_verified" OR "verified_at" IS NOT NULL)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_answers_question_status"
        ON "dawah_answers" ("question_id", "status")
    `);
    // THE race-proof invariant: at most one verified answer per question.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_dawah_answers_one_verified"
        ON "dawah_answers" ("question_id") WHERE "is_verified"
    `);
    // Denormalised pointer on the question, added after the answers table exists.
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD CONSTRAINT "FK_dawah_questions_verified_answer" FOREIGN KEY ("verified_answer_id")
          REFERENCES "dawah_answers"("id") ON DELETE SET NULL
    `);

    // ── dawah_votes ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dawah_votes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "answer_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "value" smallint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_votes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_votes_answer" FOREIGN KEY ("answer_id")
          REFERENCES "dawah_answers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_votes_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        -- This constraint IS the rule. There is no other enforcement.
        CONSTRAINT "UQ_dawah_votes_one_per_user" UNIQUE ("answer_id", "user_id"),
        CONSTRAINT "CHK_dawah_votes_value" CHECK ("value" IN (-1, 1))
      )
    `);

    // ── dawah_reports ────────────────────────────────────────────────────────────────
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
        CONSTRAINT "FK_dawah_reports_reporter" FOREIGN KEY ("reporter_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_reports_handled_by" FOREIGN KEY ("handled_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_dawah_reports_target" CHECK ("target_type" IN ('question', 'answer')),
        CONSTRAINT "CHK_dawah_reports_status" CHECK ("status" IN ('open', 'actioned', 'dismissed')),
        -- One report per person per item: reporting is a weapon too.
        CONSTRAINT "UQ_dawah_reports_one_per_user" UNIQUE ("target_type", "target_id", "reporter_id")
      )
    `);
    // The moderation queue reads this: open reports, oldest first.
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_reports_status_created"
        ON "dawah_reports" ("status", "created_at")
    `);
    // NOTE: target_id is intentionally NOT a foreign key — it points at either table
    // (polymorphic). The service is responsible for validating the target exists. A
    // cross-table FK is not expressible here, and two nullable FK columns would let a row
    // reference both or neither.

    // ── dawah_moderation_log ─────────────────────────────────────────────────────────
    // Append-only. Hiding a member's religious question is a social act in a real
    // community: "who hid my question and why" must have an answer that is not "nobody
    // knows". moderator_id is NULLABLE because auto-hide has no human behind it.
    await queryRunner.query(`
      CREATE TABLE "dawah_moderation_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "moderator_id" uuid,
        "action" varchar(30) NOT NULL,
        "target_type" varchar(20) NOT NULL,
        "target_id" uuid NOT NULL,
        "reason" text NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_moderation_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_moderation_log_moderator" FOREIGN KEY ("moderator_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_dawah_moderation_log_target" CHECK ("target_type" IN ('question', 'answer')),
        CONSTRAINT "CHK_dawah_moderation_log_action"
          CHECK ("action" IN ('auto_hide', 'hide', 'restore', 'lock', 'unlock', 'delete', 'policy_change'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_moderation_log_target"
        ON "dawah_moderation_log" ("target_type", "target_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order of creation. The FK on questions.verified_answer_id must go before
    // dawah_answers, or the drop is refused.
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" DROP CONSTRAINT IF EXISTS "FK_dawah_questions_verified_answer"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_moderation_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_answers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_questions"`);
    await queryRunner.query(`
      ALTER TABLE "dawah_categories"
        DROP CONSTRAINT IF EXISTS "CHK_dawah_categories_answer_policy",
        DROP COLUMN IF EXISTS "answer_policy"
    `);
  }
}
