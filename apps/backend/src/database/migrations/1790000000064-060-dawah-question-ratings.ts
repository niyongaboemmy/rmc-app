import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Was this answer helpful?" on a published Q&A entry.
 *
 * The signal RMC has no other way to get. View counts say an entry was opened, not that
 * it landed; a reader who could not follow the answer leaves exactly the same trace as
 * one who was satisfied. This separates them, so an answer that is being read and failing
 * can be found and rewritten.
 *
 * ── Anonymous, and therefore soft ───────────────────────────────────────────────────
 *
 * The detail page is public and most of its readers have no account, so the rating is
 * keyed on a browser token the client mints and stores locally, not on a user id. Only
 * the SHA-256 is kept — the raw token never reaches this table.
 *
 * UQ_dawah_question_ratings_one_per_voter is the whole dedupe rule; a re-rate UPDATEs the
 * row it finds. Clearing localStorage buys another vote, and that is accepted: the number
 * is an editorial hint for RMC, never shown publicly and never a score attached to a
 * ruling, so the cost of a stuffed tally is bounded at "RMC looks at an entry that did not
 * need it".
 *
 * `ip_hash` is stored for abuse triage but is deliberately OUT of the unique key. Putting
 * it in would give a whole mosque behind one NAT a single vote between them.
 *
 * ON DELETE CASCADE: ratings are about an entry and have no meaning once it is gone.
 * Questions are soft-deleted (deleted_at), so this only fires on a genuine hard delete.
 */
export class DawahQuestionRatings1790000000064 implements MigrationInterface {
  name = 'DawahQuestionRatings1790000000064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dawah_question_ratings" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "helpful"     boolean NOT NULL,
        "voter_hash"  varchar(64) NOT NULL,
        "ip_hash"     varchar(64),
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_question_ratings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_question_ratings_question"
          FOREIGN KEY ("question_id") REFERENCES "dawah_questions"("id") ON DELETE CASCADE
      )
    `);

    // The "one rating per browser per entry" rule. Nothing else enforces it.
    await queryRunner.query(`
      ALTER TABLE "dawah_question_ratings"
        ADD CONSTRAINT "UQ_dawah_question_ratings_one_per_voter"
          UNIQUE ("question_id", "voter_hash")
    `);

    // Serves the admin tally, which groups by question_id.
    await queryRunner.query(`
      CREATE INDEX "IDX_dawah_question_ratings_question"
        ON "dawah_question_ratings" ("question_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dawah_question_ratings"`);
  }
}
