import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobPostings1790000000042 implements MigrationInterface {
  name = 'JobPostings1790000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_postings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "slug" varchar(220) NOT NULL,
        "department" varchar(150),
        "employment_type" varchar(30) NOT NULL DEFAULT 'full_time'
          CHECK (employment_type IN ('full_time','part_time','contract','internship','volunteer')),
        "location" varchar(150),
        "district_id" uuid,
        "description" text NOT NULL,
        "responsibilities" text,
        "requirements" text,
        "number_of_positions" integer NOT NULL DEFAULT 1,
        "salary_range" varchar(120),
        "status" varchar(20) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','open','closed')),
        "application_deadline" timestamptz,
        "posted_by" uuid,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_job_postings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_postings_district"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id"),
        CONSTRAINT "FK_job_postings_posted_by"
          FOREIGN KEY ("posted_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_job_postings_slug" ON "job_postings" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_postings_status" ON "job_postings" ("status")`,
    );

    // Link applications to postings.
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN "job_posting_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "job_applications" ADD CONSTRAINT "FK_job_applications_posting"
        FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_applications_posting" ON "job_applications" ("job_posting_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_applications_posting"`);
    await queryRunner.query(
      `ALTER TABLE "job_applications" DROP CONSTRAINT IF EXISTS "FK_job_applications_posting"`,
    );
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "job_posting_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_postings"`);
  }
}
