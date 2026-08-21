import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dawah Discussions — permissions and the two new roles
 * (docs/dawah-discussions-implementation-plan.md §3, confirmed by RMC 16 July 2026).
 *
 * Two new authorities, deliberately NOT folded into `dawah:manage`:
 *
 *   · discussions:moderate — hide/restore/lock, work the report queue, set a category's
 *                            answer policy.
 *   · discussions:verify   — mark one answer "Verified by RMC". This is speaking for RMC
 *                            on a point of religion.
 *
 * ── Two things here will look like bugs. They are not. ──────────────────────────────
 *
 * 1. SUPER ADMIN DOES NOT GET `discussions:verify`.
 *    Being able to run the platform is not the same as being qualified to rule on
 *    religious practice. A superadmin who is not a scholar must not be able to stamp
 *    RMC's endorsement on an answer about, say, whether a marriage is valid. This is the
 *    one permission in the system that is about knowledge, not access. If RMC decides
 *    otherwise, that is a one-line migration — but it should be a decision, not an
 *    accident of "superadmin gets everything".
 *
 * 2. `Operator` DOES NOT GET `discussions:moderate`.
 *    RMC chose a dedicated `Moderator` role (§10-Q4) so trusted community members can
 *    moderate without being handed admin access, and so moderation does not silently
 *    land on whoever happens to hold Operator next. Moderating religious discussion is
 *    not an operations duty.
 *
 * The grant pattern (jsonb_agg over the existing array) is copied from
 * 030-subscribers-permissions.ts — do not improvise it.
 */
export class DawahDiscussionsPermissions1786000000028 implements MigrationInterface {
  name = 'DawahDiscussionsPermissions1786000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── The Scholar role ─────────────────────────────────────────────────────────────
    // Holds `discussions:verify` and nothing else. A scholar has no business in the
    // members table. is_system = false: RMC appoints and removes scholars themselves.
    await queryRunner.query(
      `
      INSERT INTO "roles" ("name", "slug", "description", "permissions", "is_system")
      VALUES (
        'Scholar',
        'scholar',
        'Verifies answers in Dawah Discussions. May mark one answer per question as "Verified by RMC". No administrative access.',
        $1::jsonb,
        false
      )
      ON CONFLICT ("name") DO NOTHING
    `,
      [JSON.stringify(['discussions:verify'])],
    );

    // ── The Moderator role ───────────────────────────────────────────────────────────
    // Holds `discussions:moderate` only, so a trusted community member can work the
    // report queue without admin access (§10-Q4, answered 16 July).
    await queryRunner.query(
      `
      INSERT INTO "roles" ("name", "slug", "description", "permissions", "is_system")
      VALUES (
        'Moderator',
        'moderator',
        'Moderates Dawah Discussions: works the report queue, hides/restores/locks posts, sets a category answer policy. No administrative access.',
        $1::jsonb,
        false
      )
      ON CONFLICT ("name") DO NOTHING
    `,
      [JSON.stringify(['discussions:moderate'])],
    );

    // ── Grant moderation (NOT verification) to the admin roles ───────────────────────
    // So the report queue is never unstaffed on day one, before a Moderator exists.
    await queryRunner.query(
      `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb) || $1::jsonb) AS elem
        )
        WHERE slug IN ('superadmin', 'admin')
      `,
      [JSON.stringify(['discussions:moderate'])],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the grant from the admin roles. Only `discussions:moderate` was granted to
    // them, so only that comes off — `discussions:verify` was never theirs.
    await queryRunner.query(
      `
        UPDATE roles
        SET permissions = COALESCE(
          (
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(permissions) AS elem
            WHERE elem <> $1::jsonb
          ),
          '[]'::jsonb
        )
        WHERE slug IN ('superadmin', 'admin')
      `,
      [JSON.stringify('discussions:moderate')],
    );

    // Drop the roles only if nobody was assigned them — deleting a role out from under a
    // live user would orphan their session's authority.
    await queryRunner.query(`
      DELETE FROM "roles" r
      WHERE r."slug" IN ('scholar', 'moderator')
        AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."role_id" = r."id")
    `);
  }
}
