import { MigrationInterface, QueryRunner } from 'typeorm';

export class MosqueImamPhoto1781957702481 implements MigrationInterface {
  name = 'MosqueImamPhoto1781957702481';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_photo" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_photo"`);
  }
}
