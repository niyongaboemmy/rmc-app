import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the imam's phone number to the `mosques` table — shown in the public
 * mosque-finder popup alongside the imam name/photo. Embedded on the mosque
 * (like imam_name / imam_photo) rather than joined from a user record.
 */
export class MosqueImamPhone1781957702484 implements MigrationInterface {
  name = 'MosqueImamPhone1781957702484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_phone" varchar(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_phone"`);
  }
}
