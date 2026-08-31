import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops `dawah_questions.last_activity_at`, which never meant what it says.
 *
 * It survived the forum model, where a question's "activity" was the answers and votes
 * arriving underneath it. None of that exists now, and the column was left behind
 * half-wired: written when a question is submitted, created or answered, and by nothing
 * else. Editing an entry does not touch it. Hiding, restoring or deleting one does not
 * touch it. A rating does not touch it.
 *
 * So on a published entry it freezes at the moment it was answered and never moves again
 * — an entry rewritten yesterday still reports June. That is worse than an unused column:
 * anyone who trusted the name would be reading a number that stopped being true the day
 * the entry went live. Nothing reads it today, which is the only reason it has caused no
 * harm.
 *
 * `created_at`, `answered_at` and `updated_at` already cover every question it was
 * standing in for, and `updated_at` — unlike this — actually moves on every write, so a
 * "recently revised" signal has a working source without it.
 *
 * NOTE: `dawah_course_enrollments.last_activity_at` is a DIFFERENT column and stays. That
 * one is genuinely maintained, by DawahEnrollmentService on lesson progress. Two columns
 * sharing a name where only one is accurate is its own reason to remove this.
 */
export class DropQuestionLastActivity1790000000071 implements MigrationInterface {
  name = 'DropQuestionLastActivity1790000000071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" DROP COLUMN IF EXISTS "last_activity_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreated with the same shape and default. The per-row values cannot be restored,
    // but they were only ever the create/answer timestamps that `created_at` and
    // `answered_at` still hold.
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD COLUMN "last_activity_at" timestamptz NOT NULL DEFAULT now()
    `);
  }
}
