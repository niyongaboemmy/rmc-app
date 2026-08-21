import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turn the death certificate into a real uploaded file.
 *
 * `death_certificate` used to hold only a filename the browser typed — no file was
 * ever uploaded, so the admin's "Download" affordance did nothing. It now holds the
 * file-server key, with the metadata the admin UI needs to render the document
 * (mime decides <img> vs <iframe>; the original name is what the family saw).
 *
 * Legacy rows keep their filename in `death_certificate` but have no mime type, so
 * the UI can tell "a name with no file behind it" apart from a real upload.
 */
export class FuneralDeathCertificateFile1786000000020 implements MigrationInterface {
  name = 'FuneralDeathCertificateFile1786000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "funeral_requests"
        ADD COLUMN IF NOT EXISTS "death_certificate_name" varchar(255),
        ADD COLUMN IF NOT EXISTS "death_certificate_mime" varchar(100),
        ADD COLUMN IF NOT EXISTS "death_certificate_size" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "funeral_requests"
        DROP COLUMN IF EXISTS "death_certificate_name",
        DROP COLUMN IF EXISTS "death_certificate_mime",
        DROP COLUMN IF EXISTS "death_certificate_size"
    `);
  }
}
