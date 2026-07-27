import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a reviewer's "request more information" name WHICH parts of a bid are
 * wrong — field groups and/or documents — instead of only describing them in
 * free text. The bidder may then change exactly those and nothing else.
 *
 * Both stored as TypeORM `simple-array` (a plain comma-separated text column):
 * the values are tiny fixed vocabularies ('company', 'bid_amount',
 * 'tax_clearance'…) that never contain a comma. Mirrors migration 045, which did
 * the same for Hajj receipts.
 *
 * Nullable, and null on every existing row: a legacy "more info requested" bid
 * simply falls back to the old behaviour of letting the bidder edit everything,
 * which is what those bidders were already told they could do.
 */
export class TenderMoreInfoTargets1790000000053 implements MigrationInterface {
  name = 'TenderMoreInfoTargets1790000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tender_applications" ADD COLUMN IF NOT EXISTS "more_info_fields" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tender_applications" ADD COLUMN IF NOT EXISTS "more_info_document_types" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tender_applications" DROP COLUMN IF EXISTS "more_info_document_types"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tender_applications" DROP COLUMN IF EXISTS "more_info_fields"`,
    );
  }
}
