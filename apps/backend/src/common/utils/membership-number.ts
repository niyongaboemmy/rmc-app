import { EntityManager } from 'typeorm';

/**
 * Allocates the next `RMC-<year>-<6-digit-seq>` from `membership_counters`
 * (migration 056).
 *
 * Runs on the caller's EntityManager so the number is claimed inside the same
 * transaction as the profile row it belongs to: a registration that rolls back
 * releases its number instead of leaving a permanent gap. The upsert is atomic,
 * so concurrent registrations serialise on the year's row rather than racing.
 *
 * Shared because there are two places a profile can be born — signup, and the
 * legacy path in MembersService for accounts that predate signup creating one.
 * They previously disagreed: this counter here, and `Math.random()` with a
 * check-then-insert retry loop there, which under concurrency could hand the
 * same number to two requests and fail one of them on the unique constraint.
 */
export async function allocateMembershipNumber(manager: EntityManager): Promise<string> {
  const year = new Date().getFullYear();
  const rows = (await manager.query(
    `INSERT INTO "membership_counters" ("year", "last_seq")
          VALUES ($1, 1)
     ON CONFLICT ("year") DO UPDATE
            SET "last_seq" = "membership_counters"."last_seq" + 1
      RETURNING "last_seq"`,
    [year],
  )) as Array<{ last_seq: number | string }>;

  const seq = Number(rows[0].last_seq);
  return `RMC-${year}-${seq.toString().padStart(6, '0')}`;
}
