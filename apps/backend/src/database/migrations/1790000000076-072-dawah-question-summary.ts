import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives each Q&A entry an authored summary, and puts it in the search index.
 *
 * The listing needed a short form of the ruling and had no field for one, so
 * DiscussionCard derived it at render time: strip the tags off the answer, cut at
 * 180 characters. That cuts mid-sentence, reads as truncation rather than a
 * summary, and no admin could improve it. It also meant the list had to carry the
 * whole answer just to show a fragment of it.
 *
 * Nullable, because an admin may publish and write the summary afterwards. The
 * service falls back to a rendered excerpt when it is blank, so a null is a
 * softer version of today rather than an empty row.
 *
 * ── The index has to move with it ────────────────────────────────────────────
 *
 * A GIN index on an EXPRESSION is only usable when the query repeats that
 * expression byte-for-byte. Adding `summary` to the service's `to_tsvector(...)`
 * without rebuilding the index does not error and does not return wrong rows —
 * Postgres silently stops using the index and recomputes the vector for every row
 * on every search. The failure is invisible until the table is large enough to
 * hurt. Migration 050 hit exactly this when it added `answer_body`; the column
 * order here matches the service's FTS_VECTOR, and the two move together.
 */
export class DawahQuestionSummary1790000000076 implements MigrationInterface {
  name = 'DawahQuestionSummary1790000000076';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" ADD COLUMN IF NOT EXISTS "summary" varchar(320)`,
    );

    // Seed from the answer so nothing looks empty on day one. This reads the
    // MARKDOWN SOURCE — SQL cannot call postExcerpt(), which renders and strips
    // tags properly — so it collapses whitespace and takes 300 characters. It is
    // a starting point for an admin to revise, not a finished summary, and only
    // answered entries get one: a pending submission has nothing to summarise.
    await queryRunner.query(`
      UPDATE "dawah_questions"
         SET "summary" = left(regexp_replace(coalesce("answer_body", ''), '\\s+', ' ', 'g'), 300)
       WHERE "answer_body" IS NOT NULL
         AND "answer_body" <> ''
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple',
          coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("answer_body", '') || ' ' || coalesce("summary", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Back to migration 050's expression, exactly — the same byte-for-byte rule
    // applies in reverse, and the service's FTS_VECTOR reverts with it.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple',
          coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("answer_body", '')))
    `);

    // No values are lost that were not derived here in the first place.
    await queryRunner.query(`ALTER TABLE "dawah_questions" DROP COLUMN IF EXISTS "summary"`);
  }
}
