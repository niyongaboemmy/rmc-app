import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Distinguishes a member who filled in the registration form from one who merely
 * has an account.
 *
 * Signup creates a `member_profiles` row for every user so a membership number is
 * reserved at the moment they join. `POST /members/register` — the form where a
 * member supplies national ID, mosque, category and consent — then refused to run,
 * because it treated the presence of any profile as proof of prior registration
 * and threw 409. Every account already had one, so the endpoint could never
 * succeed for anybody.
 *
 * The row therefore has two distinct states and no way to tell them apart. This
 * column is that flag: NULL means the stub reserved at signup, a timestamp means
 * the member submitted the form. `register()` now fills the stub in and stamps
 * this, and only rejects a second submission.
 *
 * Backfilled from `created_at` wherever a field only the form can set is present.
 * Those rows predate signup creating profiles, so they came from the form.
 * Deliberately not keyed on `consent_given`: it defaults to false and a member can
 * submit without consenting, which would misread a real submission as a stub.
 */
export class MemberProfileRegisteredAt1790000000062 implements MigrationInterface {
  name = 'MemberProfileRegisteredAt1790000000062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "member_profiles"
        ADD COLUMN IF NOT EXISTS "registered_at" timestamptz
    `);

    const result = (await queryRunner.query(`
      UPDATE "member_profiles"
         SET "registered_at" = "created_at"
       WHERE "registered_at" IS NULL
         AND ("consent_date"   IS NOT NULL
           OR "national_id"    IS NOT NULL
           OR "occupation"     IS NOT NULL
           OR "education_level" IS NOT NULL
           OR "mosque_id"      IS NOT NULL
           OR "district_id"    IS NOT NULL
           OR "emergency_contact_name" IS NOT NULL)
      RETURNING "id"
    `)) as unknown[];

    console.log(`  → marked ${result.length} profile(s) as already registered`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "member_profiles" DROP COLUMN IF EXISTS "registered_at"
    `);
  }
}
