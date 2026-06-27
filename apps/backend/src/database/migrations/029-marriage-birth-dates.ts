import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageBirthDates1786000000002 implements MigrationInterface {
  name = 'MarriageBirthDates1786000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      ADD COLUMN IF NOT EXISTS "groom_birth_date" date,
      ADD COLUMN IF NOT EXISTS "bride_birth_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marriage_applications"
      DROP COLUMN IF EXISTS "groom_birth_date",
      DROP COLUMN IF EXISTS "bride_birth_date"
    `);
  }
}
