import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends discussion search to cover RMC's ANSWER, not just the question.
 *
 * Migration 056 indexed `title || body` — correct for a forum, where the question was the
 * only thing on the row and the answers lived in another table. Now the answer is the
 * substance of the entry, and it is what a reader is actually searching for: somebody
 * looking for "combine prayers travelling" wants the ruling, and the phrase may well appear
 * only in the answer.
 *
 * ── Why this needs a migration and not just a wider query ────────────────────────────
 *
 * A GIN index on an EXPRESSION is only usable when the query repeats that expression
 * byte-for-byte. Widening the service's `to_tsvector(...)` call to include `answer_body`
 * without rebuilding the index does not error and does not return wrong rows — Postgres
 * silently stops using the index and recomputes the vector for every row on every search.
 * The failure is invisible until the table is large enough for it to hurt.
 *
 * So the two move together, and `dawah-discussions.service.ts` carries a comment saying so.
 *
 * 'simple' is kept for the reason 056 gives: the corpus is Kinyarwanda, Arabic and English
 * in one column, and an English stemmer would corrupt two of the three.
 */
export class DawahQaSearchAnswer1790000000055 implements MigrationInterface {
  name = 'DawahQaSearchAnswer1790000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple',
          coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("answer_body", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("body", '')))
    `);
  }
}
