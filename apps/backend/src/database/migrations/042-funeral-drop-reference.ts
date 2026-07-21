import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Family-facing tracking was removed, so funeral requests no longer need a
 * human-friendly reference (FNL-00001). Admins identify a request by its UUID.
 * Drops the reference column, its unique constraint/index, and the sequence.
 */
export class FuneralDropReference1786000000015 implements MigrationInterface {
  name = 'FuneralDropReference1786000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_funeral_req_reference"`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP CONSTRAINT IF EXISTS "UQ_funeral_requests_reference"`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP COLUMN IF EXISTS "reference"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS funeral_request_seq`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS funeral_request_seq START 1`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD COLUMN "reference" varchar(20)`);
    // Backfill existing rows so the NOT NULL + UNIQUE constraints can be applied.
    await queryRunner.query(`UPDATE "funeral_requests" SET "reference" = 'FNL-' || LPAD(nextval('funeral_request_seq')::text, 5, '0') WHERE "reference" IS NULL`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ALTER COLUMN "reference" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD CONSTRAINT "UQ_funeral_requests_reference" UNIQUE ("reference")`);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_req_reference" ON "funeral_requests" ("reference")`);
  }
}
