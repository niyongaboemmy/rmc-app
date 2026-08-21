import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replace the two proof-of-payment *filename* columns with real uploaded files.
 *
 * The applicant now uploads each receipt to the file server and we store its key,
 * so an admin opens the actual image/PDF instead of reading a name the applicant
 * typed. Mirrors marriage_documents, including the per-document verified flag.
 */
export class HajjDocuments1786000000019 implements MigrationInterface {
  name = 'HajjDocuments1786000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hajj_documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "document_type" varchar(40) NOT NULL,
        "file_key" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "verified" boolean NOT NULL DEFAULT false,
        "verified_by" uuid,
        "verified_at" timestamptz,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_hajj_documents_application"
          FOREIGN KEY ("application_id") REFERENCES "hajj_applications" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hajj_documents_application" ON "hajj_documents" ("application_id")`,
    );

    // The old columns only ever held a filename string typed by the browser — there
    // is no file behind them, so there is nothing to migrate.
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" DROP COLUMN IF EXISTS "registration_fee_proof"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" DROP COLUMN IF EXISTS "advance_payment_proof"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" ADD COLUMN IF NOT EXISTS "registration_fee_proof" varchar(500) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" ADD COLUMN IF NOT EXISTS "advance_payment_proof" varchar(500) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "hajj_documents"`);
  }
}
