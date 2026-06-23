import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks every existing marriage application as paid. Payment is now auto-settled
 * on submission (see MarriageService.submit), so this back-fills records created
 * before that change. `amount_paid` is set to `amount_due` so the revenue report
 * stays consistent. Historical transaction rows are intentionally not synthesised
 * — the application row itself is the source of truth for payment status/amount.
 */
export class MarriageMarkPaid1700000000011 implements MigrationInterface {
  name = 'MarriageMarkPaid1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "marriage_applications"
      SET "payment_status" = 'paid',
          "amount_paid" = "amount_due"
      WHERE "payment_status" <> 'paid'
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: prior per-row payment statuses are not retained.
  }
}
