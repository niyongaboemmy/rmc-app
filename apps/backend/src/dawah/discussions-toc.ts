import { slugify } from '../common/slugify.util';

/**
 * Anchors for the headings in a rendered answer, and the contents list built from
 * them.
 *
 * ── Why this is its own module ───────────────────────────────────────────────
 *
 * `discussions-markdown.ts` imports `marked` and sanitize-html, both ESM-only,
 * and neither loads under this project's CJS test suite — importing that module
 * at all is enough to kill a spec. This logic is the part with the rules worth
 * pinning down, so it lives where it can be tested: nothing here needs more than
 * a string and `slugify`.
 *
 * ── The input is ALREADY SANITISED ───────────────────────────────────────────
 *
 * That is a precondition, not an accident. `id` is not on the sanitiser's
 * allowlist, so an author's id is stripped before this runs and the only ids that
 * exist are the ones stamped here. It matters because an id is not inert: one
 * crafted to collide with an element the app already uses can hijack a
 * `label[for]`, break an `aria-labelledby`, or send a same-page link somewhere it
 * should not go. Sanitise first, stamp second.
 */

/** One heading in an answer, as the table of contents needs it. */
export interface TocEntry {
  /** The anchor's id. Generated here — never taken from the author's markup. */
  id: string;
  text: string;
  /** 2, 3 or 4 — the heading levels an answer may use. */
  level: number;
}

/** Inline tags survive inside a heading; the contents list wants the words only. */
function headingText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Render an answer and give its headings anchors, so a long ruling can carry a
 * table of contents.
 *
 * ── Why the ids are added AFTER sanitising ───────────────────────────────────
 *
 * `id` is not on the allowlist and is not being added to it. The sanitiser strips
 * whatever the author wrote, and then this stamps ids of its own onto the result —
 * so an id in the source can never reach the page. That matters because an id is
 * not inert: one crafted to collide with an element the app already uses can
 * hijack a `label[for]`, break `aria-labelledby`, or make a same-page link jump
 * somewhere it should not. Sanitising first and stamping second means the only
 * ids that exist are ones this function produced.
 *
 * They are namespaced for the same reason: `answer-` cannot collide with anything
 * the page defines, whatever an author calls a heading.
 *
 * ── Non-Latin headings ──────────────────────────────────────────────────────
 *
 * `slugify` reduces to [a-z0-9], so an Arabic or heavily-accented heading slugs
 * to the empty string. Those fall back to their position — `answer-s3` — which is
 * stable for a given answer and unique within it. An anchor nobody can read is
 * still an anchor that works.
 */

/**
 * Give the headings in ALREADY-SANITISED html stable anchors, and list them.
 *
 * Split out from the render so it can be tested on its own: `marked` and
 * sanitize-html are both ESM-only and cannot be loaded by this CJS suite, and a
 * rule this load-bearing should not be untestable because of a module format.
 *
 * The input being sanitised already is a precondition, not an accident — see the
 * note above about why ids are stamped last.
 */
export function addHeadingAnchors(html: string): { html: string; toc: TocEntry[] } {
  if (!html) return { html: '', toc: [] };

  const toc: TocEntry[] = [];
  const used = new Set<string>();
  let index = 0;

  // The HTML is already sanitised, so a heading here carries no attributes and
  // this matches the whole tag rather than guessing at one.
  const withIds = html.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>/g,
    (_match, levelStr: string, inner: string) => {
      index += 1;
      const level = Number(levelStr);
      const text = headingText(inner);

      const base = `answer-${slugify(text) || `s${index}`}`;
      // Two headings with the same words are ordinary in a long ruling ("Evidence"
      // under two sections). A repeated id would send both links to the first.
      let id = base;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);

      toc.push({ id, text, level });
      return `<h${level} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html: withIds, toc };
}
