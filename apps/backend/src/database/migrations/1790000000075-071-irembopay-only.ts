import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Leaves IremboPay as the only payment method.
 *
 * `BANK_TRANSFER` held the account details a good-conduct applicant was shown
 * when paying by hand. It is removed because IremboPay already offers a bank
 * channel inside its own sheet, so a separate hand-typed account number was a
 * second, unreconciled way to pay — money arriving with nothing in the ledger
 * expecting it.
 *
 * Archived transactions are unaffected: `payment_transactions.payment_method_code`
 * is a plain varchar, not a foreign key, so rows carrying the removed code still
 * read back and render through the frontend's archived-label map.
 */
export class IremboPayOnly1790000000075 implements MigrationInterface {
  name = 'IremboPayOnly1790000000075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "payment_method_settings"
      WHERE "payment_method_id" IN (SELECT "id" FROM "payment_methods" WHERE "code" = 'BANK_TRANSFER')
    `);
    await queryRunner.query(`DELETE FROM "payment_methods" WHERE "code" = 'BANK_TRANSFER'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restored inactive and without settings — the account details it held are
    // deliberately not resurrected.
    await queryRunner.query(`
      INSERT INTO "payment_methods" ("name","code","description","is_active","sort_order")
      VALUES ('Bank Transfer','BANK_TRANSFER','Direct bank account transfers',false,2)
      ON CONFLICT ("code") DO NOTHING
    `);
  }
}
