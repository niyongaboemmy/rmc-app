import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dawah Learning — course enrolment and per-lesson progress (LMS layer).
 *
 * The catalogue (052) deliberately shipped WITHOUT enrolment or progress. This
 * adds the two: a signed-in member is auto-enrolled the first time they mark a
 * lesson complete, and their progress is tracked lesson by lesson.
 *
 * Two tables:
 *  - `dawah_lesson_completions` is the source of truth: one row per
 *    (user, lesson) the moment it is completed. UNIQUE(user_id, lesson_id) makes
 *    "mark complete" idempotent — a second click is a no-op, not a duplicate.
 *  - `dawah_course_enrollments` is one row per (user, course), holding the
 *    DENORMALISED roll-up (completed_lessons / progress_percent / completed_at)
 *    so the detail page renders a progress bar without counting rows on read.
 *    The service recomputes it from the completions table on every write.
 *
 * `course_id` is duplicated onto `dawah_lesson_completions` even though it is
 * reachable through the lesson: it lets the service COUNT a user's completions
 * within a course in one indexed query, and it lets a deleted course cascade
 * its completions directly instead of relying on the lesson cascade chain.
 *
 * `dawah_courses.enrollment_count` mirrors the existing `lesson_count` pattern —
 * a denormalised counter maintained by the service on enrol, so a listing of
 * cards showing "N learners" costs no COUNT-per-card. Nothing else may write it.
 *
 * FKs to `users` cascade (a deleted member takes their progress with them),
 * matching dawah_votes (054). FKs to courses/lessons cascade so tearing down a
 * course or lesson cleans up its progress rows.
 */
export class DawahCourseProgress1790000000047 implements MigrationInterface {
  name = 'DawahCourseProgress1790000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Denormalised learner counter on the course ───────────────────────────
    await queryRunner.query(`
      ALTER TABLE "dawah_courses"
        ADD COLUMN "enrollment_count" int NOT NULL DEFAULT 0
    `);

    // ── Enrolments (one per user+course, holds the progress roll-up) ─────────
    await queryRunner.query(`
      CREATE TABLE "dawah_course_enrollments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "completed_lessons" int NOT NULL DEFAULT 0,
        "progress_percent" int NOT NULL DEFAULT 0,
        "last_activity_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_course_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_course_enrollments_course" FOREIGN KEY ("course_id")
          REFERENCES "dawah_courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_course_enrollments_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_dawah_course_enrollments_one_per_user"
          UNIQUE ("course_id", "user_id"),
        CONSTRAINT "CHK_dawah_course_enrollments_percent"
          CHECK ("progress_percent" BETWEEN 0 AND 100)
      )
    `);
    // "My enrolled courses, most recent first" and per-course learner counts.
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_course_enrollments_user" ON "dawah_course_enrollments" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_course_enrollments_course" ON "dawah_course_enrollments" ("course_id")`,
    );

    // ── Lesson completions (source of truth) ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dawah_lesson_completions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "lesson_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "completed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_lesson_completions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_lesson_completions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_lesson_completions_lesson" FOREIGN KEY ("lesson_id")
          REFERENCES "dawah_course_lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dawah_lesson_completions_course" FOREIGN KEY ("course_id")
          REFERENCES "dawah_courses"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_dawah_lesson_completions_one_per_user"
          UNIQUE ("user_id", "lesson_id")
      )
    `);
    // Count / list a user's completions within a course in one indexed pass.
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_lesson_completions_course_user" ON "dawah_lesson_completions" ("course_id", "user_id")`,
    );

    // No backfill: there is no historical progress to migrate — the feature did
    // not exist. enrollment_count starts at 0, correctly.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dawah_lesson_completions"`);
    await queryRunner.query(`DROP TABLE "dawah_course_enrollments"`);
    await queryRunner.query(`ALTER TABLE "dawah_courses" DROP COLUMN "enrollment_count"`);
  }
}
