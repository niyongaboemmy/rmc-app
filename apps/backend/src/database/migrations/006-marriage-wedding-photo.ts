import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageWeddingPhoto1700000000006 implements MigrationInterface {
  name = 'MarriageWeddingPhoto1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "wedding_photo_url" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "wedding_photo_url"
    `);
  }
}
