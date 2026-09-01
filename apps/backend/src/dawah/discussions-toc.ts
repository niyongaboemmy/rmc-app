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

/**
 * The named entities `marked` actually emits, plus the few a writer types directly.
 *
 * Not a full HTML entity table: this decodes a heading for display and for a slug,
 * and an unrecognised entity is handled by the numeric pass below or left alone —
 * both of which are better than the alternative that shipped first, where every
 * entity fell through as literal text and `&nbsp;` became part of the anchor id.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
};

/** Inline tags survive inside a heading; the contents list wants the words only. */
function headingText(inner: string): string {
  return (
    inner
      .replace(/<[^>]*>/g, '')
      // Numeric first, decimal and hex — `&#8230;` and `&#x2026;` are the same
      // ellipsis, and marked emits either depending on what was typed.
      .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) =>
        String.fromCodePoint(parseInt(code, 16)),
      )
      .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
      .replace(/\s+/g, ' ')
      .trim()
  );
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

  /**
   * Attributes are tolerated even though the sanitiser strips them all today.
   *
   * The first version matched `<h2>` exactly, on the reasoning that sanitised
   * headings are bare. True — but it made this silently depend on a config file it
   * does not import: allow one attribute on a heading and every anchor vanishes and
   * the contents list empties, with nothing failing. Matching optional attributes
   * costs a few characters and removes the coupling.
   *
   * Any attributes found are DISCARDED rather than carried over: this stamps the
   * id, and preserving an author-supplied one is precisely what must not happen.
   */
  const withIds = html.replace(
    /<h([2-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g,
    (match, levelStr: string, inner: string) => {
      const level = Number(levelStr);
      const text = headingText(inner);

      // An empty heading is not a place to jump to, and listing it puts a blank
      // row in the contents that looks like a broken link. Left exactly as it was.
      if (!text) return match;

      index += 1;
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
