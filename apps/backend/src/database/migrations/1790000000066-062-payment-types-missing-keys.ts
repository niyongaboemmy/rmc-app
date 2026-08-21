import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the payment types that `PaymentTypeKey` was missing.
 *
 * Funeral, hajj, tender and scholarship all charge fees today, but had no row
 * in `payment_types` — so they could not be priced from the admin UI, and with
 * IremboPay they could not be mapped to a product either. Seeded inactive: an
 * admin turns each on once its amount and product code are set.
 *
 * Hajj is the one worth noting — IremboPay's native partial payments replace
 * the hand-rolled instalment handling once this type is mapped.
 */
export class PaymentTypesMissingKeys1790000000066 implements MigrationInterface {
  name = 'PaymentTypesMissingKeys1790000000066';

  private readonly keys = ['FUNERAL_FEE', 'HAJJ_FEE', 'TENDER_FEE', 'SCHOLARSHIP_FEE'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "payment_types" ("name", "key", "description", "is_active")
      VALUES
        ('Funeral Services',   'FUNERAL_FEE',     'Funeral transport and burial service fees',   false),
        ('Hajj & Umrah',       'HAJJ_FEE',        'Hajj and Umrah package fees and instalments', false),
        ('Tender Fees',        'TENDER_FEE',      'Tender document and application fees',        false),
        ('Scholarship Fees',   'SCHOLARSHIP_FEE', 'Scholarship application processing fees',     false)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only remove the rows if nothing has been charged against them — deleting a
    // type that a live transaction references would orphan the ledger.
    await queryRunner.query(
      `DELETE FROM "payment_types"
       WHERE "key" = ANY($1)
         AND NOT EXISTS (
           SELECT 1 FROM "payment_transactions" t WHERE t."payment_type_key" = "payment_types"."key"
         )`,
      [this.keys],
    );
  }
}
