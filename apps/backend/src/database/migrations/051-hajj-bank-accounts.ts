import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hajj bank accounts — the accounts an applicant pays the Hajj fees into,
 * shown on the public Hajj page and managed from Content → Hajj Bank Accounts.
 *
 * Until now the registration form asked applicants to upload proof of payment
 * without ever telling them where to pay, and the single global BANK_TRANSFER
 * account in payment settings cannot express more than one bank — nor a
 * separate USD account, which Hajj now needs because a fee can be quoted in
 * RWF or USD (see 050).
 *
 * Mirrors hajj_requirements: ordered, activatable, soft-deletable.
 */
export class HajjBankAccounts1786000000024 implements MigrationInterface {
  name = 'HajjBankAccounts1786000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hajj_bank_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "bank_name" varchar(120) NOT NULL,
        "account_name" varchar(120) NOT NULL,
        "account_number" varchar(50) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "swift_code" varchar(20),
        "branch" varchar(120),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_hajj_bank_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_hajj_bank_account_currency" CHECK ("currency" IN ('RWF', 'USD'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hajj_bank_account_sort" ON "hajj_bank_accounts" ("sort_order")`,
    );

    // No seed: an account number is real money. A placeholder here would be
    // rendered on a public page as if it were RMC's, so the page shows an
    // honest empty state until an admin enters the real ones — the same rule
    // good-conduct's bank-transfer details follow.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hajj_bank_accounts"`);
  }
}
