import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A short statement of the ruling, shown above the full answer on the entry page.
 *
 * ── Why this is not `summary` ────────────────────────────────────────────────
 *
 * `summary` (migration 072) is the LISTING lede: it exists so a row in the feed
 * says enough for a reader to decide whether to open it, and it is what the meta
 * description uses. This one is read AFTER that decision, at the top of the
 * answer, by somebody who wants the ruling before the reasoning.
 *
 * They are different lengths for the same reason — 320 against 600 — and they
 * are written for different moments. Collapsing them into one field would mean
 * either a listing row carrying three sentences of evidence, or an answer opening
 * with a fragment written to fit a card.
 *
 * NOT backfilled. There is nothing to derive it from that would not simply be
 * `summary` again, and copying that in would put words under a heading that says
 * a scholar wrote them. Null renders nothing.
 *
 * ── The index moves with it ──────────────────────────────────────────────────
 *
 * A GIN index on an expression is only usable when the query repeats it
 * byte-for-byte, so widening FTS_VECTOR without rebuilding would silently drop
 * the listing back to a sequential scan. Same discipline as 050 and 072; the
 * column order here matches the service's constant exactly.
 */
export class DawahAnswerSummary1790000000079 implements MigrationInterface {
  name = 'DawahAnswerSummary1790000000079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" ADD COLUMN IF NOT EXISTS "answer_summary" varchar(600)`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple',
          coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("answer_body", '') || ' ' || coalesce("summary", '') || ' ' || coalesce("answer_summary", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Back to 072's expression, exactly — the same byte-for-byte rule applies in
    // reverse, and the service's FTS_VECTOR reverts with it.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dawah_questions_fts"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_questions_fts"
        ON "dawah_questions"
        USING GIN (to_tsvector('simple',
          coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("answer_body", '') || ' ' || coalesce("summary", '')))
    `);

    // Authored text, and the only copy of it. Reverting this loses it.
    await queryRunner.query(
      `ALTER TABLE "dawah_questions" DROP COLUMN IF EXISTS "answer_summary"`,
    );
  }
}
