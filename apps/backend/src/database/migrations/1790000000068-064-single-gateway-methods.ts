import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reduces the payment methods to the two that still do something.
 *
 * `MOMO_INTOUCH` (retired with the IntouchPay decommissioning), `CARD` and
 * `CASH` were rows nothing read: no provider was registered for any of them, so
 * they could never take a payment, and they appeared in the admin picker only
 * to be permanently switched off.
 *
 * `BANK_TRANSFER` stays. It is not a gateway — it holds the account details a
 * good-conduct applicant is shown when paying by manual transfer, and deleting
 * it would blank that public page.
 *
 * Archived transactions are unaffected: `payment_transactions.payment_method_code`
 * is a plain varchar, not a foreign key, so rows carrying a removed code still
 * read back. They render the raw code instead of a friendly label.
 */
export class SingleGatewayMethods1790000000068 implements MigrationInterface {
  name = 'SingleGatewayMethods1790000000068';

  private static readonly REMOVED = ['MOMO_INTOUCH', 'CARD', 'CASH'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const codes = SingleGatewayMethods1790000000068.REMOVED.map((c) => `'${c}'`).join(',');

    // Settings first — payment_method_settings references the method.
    await queryRunner.query(`
      DELETE FROM "payment_method_settings"
      WHERE "payment_method_id" IN (SELECT "id" FROM "payment_methods" WHERE "code" IN (${codes}))
    `);
    await queryRunner.query(`DELETE FROM "payment_methods" WHERE "code" IN (${codes})`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restored inactive and without settings: the credentials they once held are
    // deliberately not resurrected.
    await queryRunner.query(`
      INSERT INTO "payment_methods" ("name","code","description","is_active","sort_order")
      VALUES
        ('Mobile Money (IntouchPay — retired)','MOMO_INTOUCH','Retired 2026-08. Historical transactions only.',false,1),
        ('Card Payment','CARD','Debit / credit card payments',false,3),
        ('Cash','CASH','In-person cash payments',false,4)
      ON CONFLICT ("code") DO NOTHING
    `);
  }
}
