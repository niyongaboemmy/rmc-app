import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Families now only indicate whether they need transportation support. Drop the
 * other arrangement service flags (ghusl / kafan / janāzah prayer / grave prep).
 */
export class FuneralTransportOnly1786000000014 implements MigrationInterface {
  name = 'FuneralTransportOnly1786000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP COLUMN IF EXISTS "arr_ghusl_required"`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP COLUMN IF EXISTS "arr_kafan_required"`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP COLUMN IF EXISTS "arr_janazah_prayer_required"`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" DROP COLUMN IF EXISTS "arr_grave_preparation_required"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD COLUMN "arr_ghusl_required" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD COLUMN "arr_kafan_required" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD COLUMN "arr_janazah_prayer_required" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "funeral_requests" ADD COLUMN "arr_grave_preparation_required" boolean NOT NULL DEFAULT false`);
  }
}
