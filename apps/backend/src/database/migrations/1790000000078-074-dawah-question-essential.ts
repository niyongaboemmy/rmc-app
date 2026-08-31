import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks an entry as one of "The Essential Answers" — the curated set shown
 * beside the chronological feed on /dawah/discussions.
 *
 * Curated, not computed. The alternative was to fill that panel with whatever
 * had the most views, which rewards whatever ranked well early rather than what
 * a new Muslim actually needs first. "A carefully selected collection" is a claim
 * about editorial judgement, so it has to be somebody's judgement.
 *
 * No backfill: nothing is essential until RMC says so. An empty panel on day one
 * is honest, and the alternative — seeding it with the newest few — would put
 * entries under a heading that promises they were chosen.
 *
 * Not indexed. The flag is read with a category filter against a table of tens of
 * rows, where Postgres will sequential-scan whatever we build; an index here
 * would be cargo cult. Worth revisiting if the corpus reaches the thousands.
 */
export class DawahQuestionEssential1790000000078 implements MigrationInterface {
  name = 'DawahQuestionEssential1790000000078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_questions"
        ADD COLUMN IF NOT EXISTS "is_essential" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The curation is lost, because it lived only here. That is what reverting
    // this migration means, and there is nothing to reconstruct it from.
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" DROP COLUMN IF EXISTS "is_essential"`,
    );
  }
}
