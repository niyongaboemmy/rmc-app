import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The six built-in leadership portraits move off i.postimg.cc and onto the
 * frontend's own static files.
 *
 * The About editors seeded their leader rows with postimg URLs, and those rows
 * were published as-is, so the About page (and the leader profile modal, which
 * requests a second size) fetched every portrait through next/image from a
 * free image host that answers in seconds when it answers at all. The same six
 * files now ship in `apps/frontend/public/leaders/`, and the code defaults
 * point there; this rewrites the copies already saved in `site_content` so the
 * live rows follow. Leaders whose photo an admin uploaded (a file-server key or
 * any other URL) are untouched.
 *
 * `down()` puts the postimg URLs back for rows that still carry the local
 * paths — a straight inverse of the same table.
 */

const PORTRAITS: Record<string, string> = {
  'https://i.postimg.cc/8CKkfkMS/Mufti.jpg': '/leaders/mufti.jpg',
  'https://i.postimg.cc/mkTL1ckm/V1A8567.jpg': '/leaders/deputy-mufti.jpg',
  'https://i.postimg.cc/9f1JHK96/Qadh.jpg': '/leaders/qadhi.jpg',
  'https://i.postimg.cc/Cx0M5wJm/P1180223.jpg': '/leaders/majlisi-president.jpg',
  'https://i.postimg.cc/Fsym22m4/P1180220.jpg': '/leaders/mufti-advisor.jpg',
  'https://i.postimg.cc/YSxyqhck/ES-Salim.jpg': '/leaders/executive-secretary.jpg',
};

interface Leader {
  image?: unknown;
  [key: string]: unknown;
}

/** Rewrite `leaders[].image` through `map`; null when nothing changed. */
function rewrite(
  value: Record<string, unknown>,
  map: Record<string, string>,
): Record<string, unknown> | null {
  const leaders = value.leaders;
  if (!Array.isArray(leaders)) return null;
  let changed = false;
  const next = (leaders as Leader[]).map((l) => {
    const image = typeof l?.image === 'string' ? map[l.image] : undefined;
    if (!image) return l;
    changed = true;
    return { ...l, image };
  });
  return changed ? { ...value, leaders: next } : null;
}

async function apply(queryRunner: QueryRunner, map: Record<string, string>): Promise<void> {
  const rows: Array<{ id: string; value: Record<string, unknown> }> = await queryRunner.query(
    `SELECT id, value FROM "site_content" WHERE section_key = 'about'`,
  );
  for (const row of rows) {
    const next = rewrite(row.value ?? {}, map);
    if (!next) continue;
    await queryRunner.query(`UPDATE "site_content" SET value = $1::jsonb WHERE id = $2`, [
      JSON.stringify(next),
      row.id,
    ]);
  }
}

export class LeaderPortraitsLocal1790000000084 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await apply(queryRunner, PORTRAITS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const inverse = Object.fromEntries(Object.entries(PORTRAITS).map(([from, to]) => [to, from]));
    await apply(queryRunner, inverse);
  }
}
