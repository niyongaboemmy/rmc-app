import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackingOtps1790000000044 implements MigrationInterface {
  name = 'TrackingOtps1790000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tracking_otps" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subject_type" varchar(40) NOT NULL,
        "subject_id" uuid NOT NULL,
        "phone" varchar(20) NOT NULL,
        "otp_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "attempts" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tracking_otps" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tracking_otps_subject" ON "tracking_otps" ("subject_type", "subject_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tracking_otps_expires" ON "tracking_otps" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_otps"`);
  }
}
