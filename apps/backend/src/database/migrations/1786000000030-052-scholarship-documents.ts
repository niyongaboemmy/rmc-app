import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScholarshipDocuments1786000000030 implements MigrationInterface {
  name = 'ScholarshipDocuments1786000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scholarship_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "document_type" varchar(50) NOT NULL
          CHECK (document_type IN ('transcript','academic_record','proof','additional')),
        "file_key" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "uploaded_by" uuid,
        "verified" boolean NOT NULL DEFAULT false,
        "verified_by" uuid,
        "verified_at" timestamptz,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_scholarship_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scholarship_documents_application"
          FOREIGN KEY ("application_id") REFERENCES "scholarship_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_scholarship_documents_uploaded_by"
          FOREIGN KEY ("uploaded_by") REFERENCES "users"("id"),
        CONSTRAINT "FK_scholarship_documents_verified_by"
          FOREIGN KEY ("verified_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_scholarship_doc_application" ON "scholarship_documents" ("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scholarship_documents"`);
  }
}
