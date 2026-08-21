import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full-text search index for discussion questions (plan §7, DB-3).
 *
 * Uses the 'simple' configuration, NOT 'english' — and that is a deliberate correctness
 * choice, not laziness. The corpus is Kinyarwanda, Arabic and English mixed in ONE column
 * (a question's `language` says which). An English stemmer would mangle the other two:
 * it would stem Kinyarwanda words as if they were English and index Arabic as opaque
 * tokens. 'simple' does no stemming — the trade is that English "praying" won't match
 * "prayer", which is the right trade when two of three languages would otherwise be
 * corrupted. Revisit only if the corpus becomes majority-English, which it will not.
 *
 * Additive and reversible. The search UI that uses it lands in Phase D; the index exists
 * now so that ships as a query change, not a migration.
 */
export class DawahDiscussionsSearch1786000000029 implements MigrationInterface {
  name = 'DawahDiscussionsSearch1786000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("body", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
  }
}
