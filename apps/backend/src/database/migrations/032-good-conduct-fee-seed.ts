import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the GOOD_CONDUCT_FEE payment type and a default rate.
 * Placeholder amount (2000 RWF) — adjust via /admin/settings/payments once RMC leadership confirms the real fee.
 */
export class GoodConductFeeSeed1700000000032 implements MigrationInterface {
  name = 'GoodConductFeeSeed1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "payment_types" ("name", "key", "description", "is_active")
      VALUES
        ('Good Conduct Certificate Fee', 'GOOD_CONDUCT_FEE', 'Good Conduct certificate request processing fee', true)
      ON CONFLICT ("key") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO payment_type_rates (payment_type_id, code, name, description, amount, sort_order)
      SELECT
        pt.id,
        r.code,
        r.name,
        r.description,
        r.amount,
        r.sort_order
      FROM payment_types pt
      CROSS JOIN (VALUES
        ('STANDARD', 'Standard Fee', 'Good Conduct certificate request fee (placeholder — adjust via admin settings)', 2000, 0)
      ) AS r(code, name, description, amount, sort_order)
      WHERE pt.key = 'GOOD_CONDUCT_FEE'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM payment_type_rates
      WHERE payment_type_id IN (SELECT id FROM payment_types WHERE key = 'GOOD_CONDUCT_FEE')
    `);
    await queryRunner.query(`DELETE FROM "payment_types" WHERE "key" = 'GOOD_CONDUCT_FEE'`);
  }
}
