import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves the membership-number sequence out of Redis and into Postgres.
 *
 * `RMC-{year}-{000001}` numbers were handed out by `INCR membership_counter:{year}`
 * in Redis, but the uniqueness that makes them meaningful is enforced by
 * `UQ_member_profiles_membership_number` in Postgres. Splitting the sequence from
 * its constraint across two stores means a Redis flush, an eviction, or a restart
 * without persistence silently rewinds the counter to 1 — and every subsequent
 * registration then dies on a duplicate-key error until the counter climbs back
 * past the existing high-water mark. Redis is a cache here; the numbers are
 * permanent records.
 *
 * `last_seq` is the last number ISSUED, so the next number is `last_seq + 1` and a
 * fresh year starts from an absent row. Allocation is a single
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING`, which is atomic under concurrency
 * and — unlike the Redis call — can join the same transaction as the
 * `member_profiles` insert it feeds, so a rolled-back registration returns its
 * number to the pool instead of burning it.
 *
 * Seeded from the highest number already issued per year rather than from zero:
 * existing profiles hold numbers this counter must never re-issue.
 *
 * Deliberately a table rather than the `CREATE SEQUENCE … nextval()` pattern used
 * by job / good-conduct / tender / hajj references. Those embed a date in the
 * prefix but run one sequence forever; membership numbers restart at 1 each year,
 * which a Postgres sequence cannot express without a scheduled reset. Preserving
 * the existing per-year numbering matters more here than matching that shape —
 * these numbers are already printed on member records.
 */
export class MembershipCounter1790000000060 implements MigrationInterface {
  name = 'MembershipCounter1790000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "membership_counters" (
        "year" integer NOT NULL,
        "last_seq" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_membership_counters" PRIMARY KEY ("year")
      )
    `);

    // High-water mark per year from the numbers already handed out. GREATEST on
    // conflict keeps this re-runnable without ever lowering a counter.
    await queryRunner.query(`
      INSERT INTO "membership_counters" ("year", "last_seq")
      SELECT
        (substring("membership_number" from '^RMC-([0-9]{4})-'))::int,
        MAX((substring("membership_number" from '^RMC-[0-9]{4}-([0-9]+)$'))::int)
      FROM "member_profiles"
      WHERE "membership_number" ~ '^RMC-[0-9]{4}-[0-9]+$'
      GROUP BY 1
      ON CONFLICT ("year") DO UPDATE
        SET "last_seq" = GREATEST("membership_counters"."last_seq", EXCLUDED."last_seq")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "membership_counters"`);
  }
}
