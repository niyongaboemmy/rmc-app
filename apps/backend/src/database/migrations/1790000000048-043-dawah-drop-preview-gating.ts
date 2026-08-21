import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dawah Learning — drop the preview / access-gating machinery.
 *
 * Product decision: every course lesson and every library book is FREELY and
 * unconditionally public. That makes three columns dead:
 *   · dawah_course_lessons.is_preview      — the "free preview" taster badge
 *   · dawah_books.visibility               — public / members gate (+ its CHECK)
 *   · dawah_books.preview_file_key         — the excerpt shown to non-members
 *
 * Dropping `visibility` drops CHK_dawah_book_visibility with it (Postgres
 * removes a column's constraints automatically). `allow_download` is untouched —
 * it is a separate download deterrent, not an access gate.
 *
 * Safe in practice: all existing books are `public` with no excerpt, so nothing
 * of value is lost. The `down()` restores the columns and the default gate for
 * a clean revert.
 */
export class DawahDropPreviewGating1790000000048 implements MigrationInterface {
  name = 'DawahDropPreviewGating1790000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_course_lessons" DROP COLUMN "is_preview"`,
    );
    // Dropping the column also drops CHK_dawah_book_visibility.
    await queryRunner.query(`ALTER TABLE "dawah_books" DROP COLUMN "visibility"`);
    await queryRunner.query(`ALTER TABLE "dawah_books" DROP COLUMN "preview_file_key"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dawah_books" ADD COLUMN "preview_file_key" varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "dawah_books" ADD COLUMN "visibility" varchar(20) NOT NULL DEFAULT 'public'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dawah_books" ADD CONSTRAINT "CHK_dawah_book_visibility" CHECK ("visibility" IN ('public', 'members'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dawah_course_lessons" ADD COLUMN "is_preview" boolean NOT NULL DEFAULT false`,
    );
  }
}
