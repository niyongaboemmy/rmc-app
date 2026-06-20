import { MigrationInterface, QueryRunner } from 'typeorm';

export class MosqueImamName1781957702480 implements MigrationInterface {
  name = 'MosqueImamName1781957702480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD COLUMN IF NOT EXISTS "imam_name" varchar(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mosques" DROP COLUMN IF EXISTS "imam_name"`);
  }
}
