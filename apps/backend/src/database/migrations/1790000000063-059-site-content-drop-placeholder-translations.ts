import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a content editor clear a translation and have it stay cleared.
 *
 * `mergeContent` (apps/frontend/src/lib/content/client.ts) used to read an empty
 * string in a saved blob as "unset" and substitute the code default for that same
 * locale. So clearing the Kinyarwanda hero headline in Edit Mode wrote "" to
 * `site_content` and then rendered the seeded Kinyarwanda copy regardless — the
 * edit persisted but was invisible, which reads as a save that silently failed.
 * The merge now honours every key a blob carries and only fills in keys it lacks.
 *
 * That flips the meaning of the empty strings ALREADY stored here. The admin form
 * editors saved `tri()`'s unfilled rw/ar as "", and those were never deliberate
 * clears — they are placeholders that leaned on the old fallback to reach the
 * seeded translation. Left alone they would now render the English fallback and
 * quietly de-translate the affected sections. So drop them: an absent key still
 * takes the default, which is what those blobs were effectively doing before.
 *
 * Scoped to TRANSLATION keys only — `en`/`rw`/`ar` members of a `Tri`, and the
 * legacy flat `<field>En`/`Rw`/`Ar` shape that About and Who We Are still use. A
 * non-translation blank such as `imageKey: ""` is a real value (an admin removing a
 * card's image) and now finally survives, so it must not be pruned. At the time of
 * writing every empty leaf in this table is a translation key, so nothing else is
 * touched today; the narrow rule is what keeps that true for later rows.
 */
export class SiteContentDropPlaceholderTranslations1790000000063 implements MigrationInterface {
  name = 'SiteContentDropPlaceholderTranslations1790000000063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { id: string; value: unknown }[] = await queryRunner.query(
      `SELECT id, value FROM site_content`,
    );

    for (const row of rows) {
      const pruned = pruneBlankTranslations(row.value);
      if (JSON.stringify(pruned) === JSON.stringify(row.value)) continue;
      await queryRunner.query(`UPDATE site_content SET value = $1::jsonb WHERE id = $2`, [
        JSON.stringify(pruned),
        row.id,
      ]);
    }
  }

  public async down(): Promise<void> {
    // Not reversible, and reversing it would be wrong: once dropped, a placeholder
    // blank is indistinguishable from a translation an admin cleared on purpose.
    // Re-adding "" to every locale key would resurrect exactly the ambiguity this
    // removed. The rows still render their seeded copy either way.
  }
}

const TRANSLATION_KEY = /^(en|rw|ar)$|(En|Rw|Ar)$/;

/** Recursively drop translation keys whose value is blank, preserving array order. */
function pruneBlankTranslations(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(pruneBlankTranslations);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const isBlank = typeof child === 'string' && child.trim() === '';
      if (isBlank && TRANSLATION_KEY.test(key)) continue;
      out[key] = pruneBlankTranslations(child);
    }
    return out;
  }
  return value;
}
