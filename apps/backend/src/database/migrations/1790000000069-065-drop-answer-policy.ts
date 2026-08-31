import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops `dawah_categories.answer_policy`, the last of the community-forum schema.
 *
 * It answered a question the product no longer asks: may a MEMBER's answer in this
 * category go live without a scholar reading it first? There are no member answers now —
 * RMC writes every answer — so the column has had nothing to decide since the editorial
 * model landed. Migration 049 said as much and left it deliberately: "A follow-up
 * migration drops them once this model has proven itself in production. Same reasoning
 * leaves dawah_categories.answer_policy in place, inert." This is that follow-up, with
 * migration 064 having taken the tables.
 *
 * Courses and books share this table and never read the column, so nothing outside
 * discussions is touched.
 *
 * ── The down path restores the exact current state ──────────────────────────────────
 *
 * All eight categories currently hold 'scholar_review', which is also the column's
 * default — so recreating it with that default returns precisely the values being
 * dropped, not an approximation. Migration 054 originally set four categories to 'open';
 * nothing carries that value today, so there is nothing further to restore.
 */
export class DropAnswerPolicy1790000000069 implements MigrationInterface {
  name = 'DropAnswerPolicy1790000000069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_categories"
        DROP CONSTRAINT IF EXISTS "CHK_dawah_categories_answer_policy",
        DROP COLUMN IF EXISTS "answer_policy"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_categories"
        ADD COLUMN "answer_policy" varchar(20) NOT NULL DEFAULT 'scholar_review',
        ADD CONSTRAINT "CHK_dawah_categories_answer_policy"
          CHECK ("answer_policy" IN ('scholar_review', 'open'))
    `);
  }
}
