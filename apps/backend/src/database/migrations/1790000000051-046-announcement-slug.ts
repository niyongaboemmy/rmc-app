import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a readable URL slug to announcements so tenders can be viewed at
 * /tenders/<slug> instead of /tenders/<uuid>. Only tenders are backfilled here;
 * other announcement types keep a NULL slug (the unique index allows many NULLs).
 *
 * The backfill runs in JS rather than SQL so it can reuse the same slug rules the
 * service uses at runtime and de-duplicate collisions deterministically.
 */

/** Mirrors slugify() in public.service — keep the two byte-identical. */
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

export class AnnouncementSlug1790000000051 implements MigrationInterface {
  name = 'AnnouncementSlug1790000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "slug" varchar(160)`,
    );

    // Backfill existing tenders, oldest first so slugs are stable across re-runs.
    const rows: { id: string; title: string; titleI18n: { en?: string } | null }[] =
      await queryRunner.query(
        `SELECT id, title, title_i18n AS "titleI18n" FROM announcements
         WHERE type = 'tender' AND slug IS NULL
         ORDER BY created_at ASC, id ASC`,
      );

    const used = new Set<string>();
    for (const r of rows) {
      const base = slugify(r.titleI18n?.en || r.title) || 'tender';
      let slug = base;
      let n = 2;
      while (used.has(slug)) slug = `${base}-${n++}`;
      used.add(slug);
      await queryRunner.query(`UPDATE announcements SET slug = $1 WHERE id = $2`, [slug, r.id]);
    }

    // Unique where present — Postgres treats NULLs as distinct, so the many
    // non-tender rows with NULL slug don't collide.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_announcements_slug" ON "announcements" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_announcements_slug"`);
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN IF EXISTS "slug"`);
  }
}
