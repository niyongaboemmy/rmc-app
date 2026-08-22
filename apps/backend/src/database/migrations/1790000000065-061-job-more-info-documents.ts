import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a reviewer name WHICH documents a job applicant must supply.
 *
 * "Request more info" stored a single free-text note, so every request was a paragraph
 * the applicant had to read and interpret — and the form they replied on had one generic
 * attachment box, with nothing tying a file to the thing that was actually missing. A
 * reviewer asking for a CV and a criminal record had no way to say so structurally, and
 * no way to tell which of the two an uploaded file answered.
 *
 * The message stays in `more_info_requested`; this holds the checklist beside it. Null
 * means the reviewer wanted information rather than files, which is why it is nullable
 * rather than an empty array — "asked for no documents" and "asked for documents, none
 * chosen" are the same thing here, and one representation is enough.
 *
 * jsonb rather than a join table: the keys are a short fixed vocabulary owned by the
 * application code (requestable-documents.ts), the list is read only with its parent row,
 * and nothing ever queries across requests by document type.
 */
export class JobMoreInfoDocuments1790000000065 implements MigrationInterface {
  name = 'JobMoreInfoDocuments1790000000065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_applications" ADD COLUMN "more_info_documents" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "more_info_documents"`,
    );
  }
}
