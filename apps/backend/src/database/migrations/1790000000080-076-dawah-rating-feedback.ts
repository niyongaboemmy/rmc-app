import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a reader say WHY, after saying whether an answer helped.
 *
 * "Was this helpful?" collects a number. The number tells RMC that entry 12 is
 * failing readers and nothing about what is wrong with it, which is the part an
 * editor can act on. These three columns carry the follow-up:
 *
 *   reason  — one of a list RMC maintains, offered when the answer did NOT help.
 *             Stored as the chosen TEXT, not an id into that list: the list is
 *             editorial copy an admin will reword, and a stored id would silently
 *             re-point last month's feedback at whatever now sits in that slot.
 *   comment — free text, offered when it DID help ("any suggestions?").
 *   email   — optional, so RMC can reply. PII: it belongs to the reader, not to
 *             the entry, and nothing public ever projects it.
 *
 * All nullable. A rating with no follow-up is the normal case and stays exactly
 * what it was — this adds to the existing row rather than creating a second
 * record, because the feedback IS the rating, said at more length.
 */
export class DawahRatingFeedback1790000000080 implements MigrationInterface {
  name = 'DawahRatingFeedback1790000000080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dawah_question_ratings"
        ADD COLUMN IF NOT EXISTS "reason" varchar(160),
        ADD COLUMN IF NOT EXISTS "comment" text,
        ADD COLUMN IF NOT EXISTS "email" varchar(160)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reader-supplied text, and the only copy of it. Reverting discards it.
    await queryRunner.query(`
      ALTER TABLE "dawah_question_ratings"
        DROP COLUMN IF EXISTS "reason",
        DROP COLUMN IF EXISTS "comment",
        DROP COLUMN IF EXISTS "email"
    `);
  }
}
