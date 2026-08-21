import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — requests lifecycle. Creates the funeral_requests table
 * (deceased / family / arrangements + current stage) and an append-only
 * funeral_status_history log of stage transitions, plus the reference sequence.
 */
export class FuneralTables1786000000004 implements MigrationInterface {
  name = 'FuneralTables1786000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS funeral_request_seq START 1`);

    await queryRunner.query(`
      CREATE TABLE "funeral_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reference" varchar(20) NOT NULL,

        -- Deceased
        "deceased_full_name" varchar(150) NOT NULL,
        "deceased_gender" varchar(10) NOT NULL,
        "deceased_date_of_birth" date,
        "deceased_date_of_death" date NOT NULL,
        "deceased_national_id" varchar(20),
        "deceased_place_of_death" varchar(200),
        "deceased_cause_of_death" text,
        "death_certificate" varchar(500),

        -- Family
        "family_next_of_kin" varchar(150) NOT NULL,
        "family_phone" varchar(30) NOT NULL,
        "family_email" varchar(150),
        "family_address" varchar(300),
        "family_emergency_contact" varchar(30),

        -- Arrangements
        "arr_preferred_mosque" varchar(200),
        "arr_preferred_cemetery" varchar(200),
        "arr_preferred_burial_date" date,
        "arr_preferred_burial_time" varchar(10),
        "arr_ghusl_required" boolean NOT NULL DEFAULT true,
        "arr_kafan_required" boolean NOT NULL DEFAULT true,
        "arr_janazah_prayer_required" boolean NOT NULL DEFAULT true,
        "arr_transportation_required" boolean NOT NULL DEFAULT false,
        "arr_grave_preparation_required" boolean NOT NULL DEFAULT false,
        "arr_notes" text,

        -- Status
        "stage" varchar(30) NOT NULL DEFAULT 'reported',

        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_funeral_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_funeral_requests_reference" UNIQUE ("reference")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_req_reference" ON "funeral_requests" ("reference")`);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_req_stage" ON "funeral_requests" ("stage")`);

    await queryRunner.query(`
      CREATE TABLE "funeral_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL,
        "stage" varchar(30) NOT NULL,
        "notes" text,
        "assigned_volunteer" varchar(150),
        "changed_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_funeral_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_funeral_history_request" FOREIGN KEY ("request_id")
          REFERENCES "funeral_requests" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_funeral_history_request" ON "funeral_status_history" ("request_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_requests"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS funeral_request_seq`);
  }
}
