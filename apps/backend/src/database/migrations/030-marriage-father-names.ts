import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageFatherNames1786000000003 implements MigrationInterface {
  name = 'MarriageFatherNames1786000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "groom_father_name" varchar(150),
      ADD COLUMN IF NOT EXISTS "bride_father_name" varchar(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "groom_father_name",
      DROP COLUMN IF EXISTS "bride_father_name"
    `);
  }
}
