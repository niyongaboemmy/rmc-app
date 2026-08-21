import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hajj requirements — admin-settable currency alongside the amount.
 *
 * The amount was always admin-editable, but the currency was hardcoded RWF
 * everywhere (column name included). Hajj is paid partly in Rwanda and partly
 * abroad, so a season can price the registration fee in RWF and the advance
 * payment in USD.
 *
 * `amount_rwf` is renamed to `amount` because the old name is a lie once the
 * currency varies per row — a column called amount_rwf holding USD is exactly
 * the kind of thing that silently misprices a fee later.
 *
 * Existing rows are RWF, which is what the DEFAULT backfills them to.
 */
export class HajjRequirementCurrency1786000000023
  implements MigrationInterface
{
  name = 'HajjRequirementCurrency1786000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" RENAME COLUMN "amount_rwf" TO "amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" ADD "currency" varchar(3) NOT NULL DEFAULT 'RWF'`,
    );
    // Guard the enum at the DB level too, not only in the DTO — this column is
    // rendered straight onto a public page.
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" ADD CONSTRAINT "CHK_hajj_requirement_currency"
       CHECK ("currency" IN ('RWF', 'USD'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Anything priced in USD has no meaningful RWF value to fall back to, so
    // clear those amounts rather than silently reinterpret them as francs.
    await queryRunner.query(
      `UPDATE "hajj_requirements" SET "amount" = NULL WHERE "currency" <> 'RWF'`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" DROP CONSTRAINT "CHK_hajj_requirement_currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" DROP COLUMN "currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_requirements" RENAME COLUMN "amount" TO "amount_rwf"`,
    );
  }
}
