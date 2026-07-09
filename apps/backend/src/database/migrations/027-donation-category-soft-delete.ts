import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add soft-delete support to donation categories so an admin can archive a
 * category (and later restore it) instead of permanently removing it. Sub-funds
 * are preserved automatically: soft-deleting the parent doesn't fire the FK
 * cascade, and they reappear with the category on restore.
 */
export class DonationCategorySoftDelete1782700000000 implements MigrationInterface {
  name = 'DonationCategorySoftDelete1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donation_categories" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
