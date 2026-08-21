import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the "request more information" step to Hajj applications, matching the
 * shape good-conduct / tenders / job-applications already use: one nullable text
 * column holding the message sent to the applicant verbatim.
 *
 * `status` is a plain varchar (not a PG enum), so the new value needs no
 * ALTER TYPE. Should a CHECK constraint ever be added to it, this migration also
 * widens that constraint if one is in force — but the base table ships without
 * one, so on a stock schema the ADD COLUMN below is the only effective change.
 */
export class HajjMoreInfoRequested1790000000049 implements MigrationInterface {
  name = 'HajjMoreInfoRequested1790000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" ADD COLUMN IF NOT EXISTS "more_info_requested" text`,
    );

    // Widen the status CHECK constraint, if one is in force.
    const [check] = await queryRunner.query(`
      SELECT con.conname AS name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'hajj_applications'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      LIMIT 1
    `);

    if (check?.name) {
      await queryRunner.query(
        `ALTER TABLE "hajj_applications" DROP CONSTRAINT "${check.name}"`,
      );
      await queryRunner.query(`
        ALTER TABLE "hajj_applications" ADD CONSTRAINT "${check.name}"
        CHECK ("status" IN ('submitted','under_review','more_info_requested','approved','rejected'))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nothing may sit in the status being removed, or the narrowed CHECK fails.
    await queryRunner.query(`
      UPDATE "hajj_applications"
      SET "status" = 'under_review'
      WHERE "status" = 'more_info_requested'
    `);

    const [check] = await queryRunner.query(`
      SELECT con.conname AS name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'hajj_applications'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      LIMIT 1
    `);

    if (check?.name) {
      await queryRunner.query(
        `ALTER TABLE "hajj_applications" DROP CONSTRAINT "${check.name}"`,
      );
      await queryRunner.query(`
        ALTER TABLE "hajj_applications" ADD CONSTRAINT "${check.name}"
        CHECK ("status" IN ('submitted','under_review','approved','rejected'))
      `);
    }

    await queryRunner.query(
      `ALTER TABLE "hajj_applications" DROP COLUMN IF EXISTS "more_info_requested"`,
    );
  }
}
