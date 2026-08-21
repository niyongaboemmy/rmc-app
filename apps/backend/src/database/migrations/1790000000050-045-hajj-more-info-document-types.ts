import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets the admin's "request more information" name WHICH receipt(s) are needed,
 * not just describe them in free text. Stored as a TypeORM `simple-array` — a
 * plain comma-separated text column — since the values are a tiny fixed set
 * ('registration_fee', 'advance_payment') that never contain a comma.
 *
 * Nullable, and null on every existing row: legacy "more info requested"
 * applications simply fall back to offering both upload slots, exactly as before.
 */
export class HajjMoreInfoDocumentTypes1790000000050 implements MigrationInterface {
  name = 'HajjMoreInfoDocumentTypes1790000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" ADD COLUMN IF NOT EXISTS "more_info_document_types" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hajj_applications" DROP COLUMN IF EXISTS "more_info_document_types"`,
    );
  }
}
