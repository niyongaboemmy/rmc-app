import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records WHICH of a scholarship's required documents an uploaded file answers.
 *
 * `scholarship_programs.required_documents` (migration 053) lets an admin say
 * "attach your latest school report and your national ID", and the detail page
 * lists exactly that. But the upload had nowhere to record which requirement it
 * satisfied: `document_type` is a loose four-value enum
 * (transcript / academic_record / proof / additional) whose own entity comment
 * calls it "a loose label". Two files both landing as `additional` leave a
 * reviewer guessing which is which.
 *
 * `requirement_key` matches the `key` inside `required_documents`, so the admin
 * console can show a file under the requirement it answers, and a missing
 * requirement is detectable rather than merely invisible.
 *
 * Nullable on purpose. Documents uploaded before this existed answer no declared
 * requirement, and inventing one for them would be a lie; scholarships that
 * declare no required documents still accept the generic slots.
 */
export class ScholarshipDocumentRequirementKey1790000000059 implements MigrationInterface {
  name = 'ScholarshipDocumentRequirementKey1790000000059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scholarship_documents" ADD COLUMN IF NOT EXISTS "requirement_key" varchar(40)`,
    );
    // Looked up per application when rendering the review screen, so index the
    // pair rather than the key alone.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scholarship_doc_requirement"
        ON "scholarship_documents" ("application_id", "requirement_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_doc_requirement"`);
    await queryRunner.query(
      `ALTER TABLE "scholarship_documents" DROP COLUMN IF EXISTS "requirement_key"`,
    );
  }
}
