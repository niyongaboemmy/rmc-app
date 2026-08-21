import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScholarshipTables1781957702600 implements MigrationInterface {
  name = 'ScholarshipTables1781957702600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS scholarship_application_seq START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "scholarship_programs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "level" varchar(20)
          CHECK (level IS NULL OR level IN ('secondary','tvet','university')),
        "amount" decimal(12,2),
        "deadline" timestamptz,
        "is_open" boolean NOT NULL DEFAULT true,

        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_scholarship_programs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "scholarship_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_number" varchar(40),

        "applicant_id" uuid NOT NULL,
        "program_id" uuid,

        -- Identity
        "full_names" varchar(150) NOT NULL,
        "date_of_birth" date,
        "gender" varchar(10) CHECK (gender IS NULL OR gender IN ('male','female')),
        "national_id" varchar(30),

        -- Residence (Cell/Village have no master-data entities yet — free text)
        "district_id" uuid,
        "sector_id" uuid,
        "cell" varchar(100),
        "village" varchar(100),

        -- Contact
        "email" varchar(255),
        "phone" varchar(20) NOT NULL,

        -- Education
        "school_name" varchar(200) NOT NULL,
        "education_level" varchar(20) NOT NULL
          CHECK (education_level IN ('secondary','tvet','university')),
        "current_year" varchar(50) NOT NULL,
        "average_grade" varchar(20),

        -- Guardian
        "guardian_name" varchar(150) NOT NULL,
        "guardian_phone" varchar(20) NOT NULL,
        "relationship" varchar(20) NOT NULL
          CHECK (relationship IN ('parent','guardian','sibling','other')),
        "motivation" text NOT NULL,

        -- Status workflow
        "status" varchar(20) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','submitted','under_review','approved','rejected','cancelled','confirmed')),

        -- Review
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,

        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_scholarship_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_scholarship_applications_application_number" UNIQUE ("application_number"),
        CONSTRAINT "FK_scholarship_applications_applicant"
          FOREIGN KEY ("applicant_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_scholarship_applications_program"
          FOREIGN KEY ("program_id") REFERENCES "scholarship_programs"("id"),
        CONSTRAINT "FK_scholarship_applications_district"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id"),
        CONSTRAINT "FK_scholarship_applications_sector"
          FOREIGN KEY ("sector_id") REFERENCES "sectors"("id"),
        CONSTRAINT "FK_scholarship_applications_reviewed_by"
          FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_scholarship_app_status" ON "scholarship_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_scholarship_app_applicant" ON "scholarship_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_scholarship_app_number" ON "scholarship_applications" ("application_number")`,
    );

    await queryRunner.query(`
      CREATE TABLE "scholarship_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_status" varchar(20),
        "to_status" varchar(20) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_scholarship_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scholarship_status_history_application"
          FOREIGN KEY ("application_id") REFERENCES "scholarship_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_scholarship_status_history_changed_by"
          FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scholarship_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scholarship_applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scholarship_programs"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS scholarship_application_seq`);
  }
}
