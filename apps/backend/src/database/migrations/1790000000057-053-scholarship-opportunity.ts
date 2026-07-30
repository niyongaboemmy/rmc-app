import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 of the opportunity-based scholarship flow: turns `scholarship_programs`
 * from a loose catalogue row into a publishable OPPORTUNITY — the thing RMC
 * announces, that an applicant reads and applies to.
 *
 * See docs/scholarship-opportunity-flow-implementation-plan.md §3 for why this
 * extends the typed table rather than reusing `announcements` (which is what a
 * tender is). Short version: a scholarship carries level, amount and slots that
 * the landing page filters on, so they must be columns, not prose.
 *
 * Label 053, not 052 — 052 is already taken by 1786000000030-052-scholarship-
 * documents.ts. The label series and the timestamp series were never reconciled;
 * skipping avoids a second duplicate.
 *
 * ── Everything here is additive ──────────────────────────────────────────────
 *
 * `title`/`description` stay and remain the fallback for the new i18n columns,
 * exactly as `announcements.title_i18n` falls back to `announcements.title`. No
 * existing row needs rewriting and no existing reader breaks.
 *
 * `is_open` is deliberately NOT dropped. The admin UI and the public list still
 * read it; it is backfilled into `status` here and retired in a later cleanup
 * once nothing reads it. Dropping it in the same migration that introduces its
 * replacement would break both surfaces at once.
 */

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 130);
}

export class ScholarshipOpportunity1790000000057 implements MigrationInterface {
  name = 'ScholarshipOpportunity1790000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        ADD COLUMN IF NOT EXISTS "slug"               varchar(160),
        ADD COLUMN IF NOT EXISTS "title_i18n"         jsonb,
        ADD COLUMN IF NOT EXISTS "description_i18n"   jsonb,
        ADD COLUMN IF NOT EXISTS "eligibility_i18n"   jsonb,
        ADD COLUMN IF NOT EXISTS "benefits_i18n"      jsonb,
        ADD COLUMN IF NOT EXISTS "required_documents" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "attachments"        jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "slots"              int,
        ADD COLUMN IF NOT EXISTS "opens_at"           timestamptz,
        ADD COLUMN IF NOT EXISTS "reference_number"   varchar(40),
        ADD COLUMN IF NOT EXISTS "status"             varchar(20) NOT NULL DEFAULT 'draft'
    `);

    // Existing rows are live catalogue entries, not drafts. Anything currently
    // open becomes `published` so it stays on the landing page the moment the
    // list starts filtering by status; anything closed becomes `closed`.
    // Getting this wrong empties the public page on deploy.
    await queryRunner.query(`
      UPDATE "scholarship_programs"
         SET "status" = CASE WHEN "is_open" THEN 'published' ELSE 'closed' END
    `);

    // Backfill slugs from the existing titles, de-duplicated. withDeleted has no
    // meaning in raw SQL, so soft-deleted rows are included on purpose — they
    // still occupy the unique index.
    const rows: { id: string; title: string }[] = await queryRunner.query(
      `SELECT id, title FROM scholarship_programs WHERE slug IS NULL ORDER BY created_at`,
    );
    const used = new Set<string>();
    for (const row of rows) {
      const base = slugify(row.title || '') || 'scholarship';
      let slug = base;
      let n = 2;
      while (used.has(slug)) slug = `${base}-${n++}`;
      used.add(slug);
      await queryRunner.query(`UPDATE scholarship_programs SET slug = $1 WHERE id = $2`, [
        slug,
        row.id,
      ]);
    }

    // Partial unique index: Postgres permits many NULLs, so a draft may sit
    // without a slug until it is named.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_scholarship_programs_slug"
        ON "scholarship_programs" ("slug") WHERE "slug" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scholarship_programs_status_deadline"
        ON "scholarship_programs" ("status", "deadline")
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        DROP CONSTRAINT IF EXISTS "CHK_scholarship_programs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        ADD CONSTRAINT "CHK_scholarship_programs_status"
        CHECK ("status" IN ('draft','published','closed'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scholarship_programs" DROP CONSTRAINT IF EXISTS "CHK_scholarship_programs_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_programs_status_deadline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scholarship_programs_slug"`);
    await queryRunner.query(`
      ALTER TABLE "scholarship_programs"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "reference_number",
        DROP COLUMN IF EXISTS "opens_at",
        DROP COLUMN IF EXISTS "slots",
        DROP COLUMN IF EXISTS "attachments",
        DROP COLUMN IF EXISTS "required_documents",
        DROP COLUMN IF EXISTS "benefits_i18n",
        DROP COLUMN IF EXISTS "eligibility_i18n",
        DROP COLUMN IF EXISTS "description_i18n",
        DROP COLUMN IF EXISTS "title_i18n",
        DROP COLUMN IF EXISTS "slug"
    `);
  }
}
