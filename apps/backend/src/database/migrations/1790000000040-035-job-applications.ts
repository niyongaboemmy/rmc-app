import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobApplications1790000000040 implements MigrationInterface {
  name = 'JobApplications1790000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS job_application_seq START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "job_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tracking_number" varchar(40) NOT NULL,

        "applicant_id" uuid NOT NULL,

        -- Applicant
        "full_names" varchar(150) NOT NULL,
        "email" varchar(255),
        "phone" varchar(20) NOT NULL,
        "position_applied_for" varchar(150) NOT NULL,

        -- Residence (Cell/Village are free text — no master-data entities)
        "district_id" uuid,
        "sector_id" uuid,
        "cell" varchar(100),
        "village" varchar(100),

        -- Uploaded documents (file-server keys)
        "documents" jsonb NOT NULL,

        -- Status workflow
        "status" varchar(30) NOT NULL DEFAULT 'submitted'
          CHECK (status IN ('submitted','under_review','shortlisted','more_info_requested',
                            'accepted','rejected','cancelled')),

        -- Review
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,
        "more_info_requested" text,

        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_job_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_applications_tracking_number" UNIQUE ("tracking_number"),
        CONSTRAINT "FK_job_applications_applicant"
          FOREIGN KEY ("applicant_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_job_applications_district"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id"),
        CONSTRAINT "FK_job_applications_sector"
          FOREIGN KEY ("sector_id") REFERENCES "sectors"("id"),
        CONSTRAINT "FK_job_applications_reviewed_by"
          FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_job_applications_status" ON "job_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_applications_applicant" ON "job_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_job_applications_tracking_number" ON "job_applications" ("tracking_number")`,
    );

    await queryRunner.query(`
      CREATE TABLE "job_application_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_job_application_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_application_status_history_application"
          FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_application_status_history_changed_by"
          FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_application_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_applications"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS job_application_seq`);
  }
}
