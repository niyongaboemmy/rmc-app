import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clears the backlog of accounts stranded on `status = 'pending'`.
 *
 * Registration has always created users as 'pending', but nothing ever promoted
 * them: `verifyPhone` set `is_phone_verified` and left `status` alone, and the
 * verification screen did not exist to be reached in the first place. Meanwhile
 * login only ever rejected 'suspended' and 'inactive' — so every one of these
 * accounts has been fully usable while reporting as pending to the admin console.
 *
 * This makes the column say what has been true all along. It grants nothing:
 * these users could already sign in before this ran. The alternative — leaving
 * them pending — is the dangerous one, because the moment anyone adds a
 * `status === 'active'` gate to login, the entire existing user base is locked
 * out at once.
 *
 * `is_phone_verified` is deliberately NOT touched. Nobody has verified a phone,
 * and claiming otherwise would launder unverified numbers into looking checked.
 * From here on the code path in `verifyPhone` keeps the two in step.
 *
 * Irreversible by design: once mixed in with genuinely active accounts, the
 * previously-pending ones cannot be told apart, and down() must not guess.
 */
export class ActivatePendingUsers1790000000061 implements MigrationInterface {
  name = 'ActivatePendingUsers1790000000061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = (await queryRunner.query(
      `UPDATE "users" SET "status" = 'active' WHERE "status" = 'pending' RETURNING "id"`,
    )) as unknown[];

    console.log(`  → activated ${result.length} previously-pending user(s)`);
  }

  public async down(): Promise<void> {
    // Intentionally a no-op. Reverting would have to mark some arbitrary set of
    // active users pending, and there is no record of which ones these were.
  }
}
