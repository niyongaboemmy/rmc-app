import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Full-text search inside an open PDF, for the Library's flipbook reader.
 *
 * ── Why this exists at all ───────────────────────────────────────────────────
 *
 * The reader paints pages to canvas and renders a pdf.js text layer over each
 * one, which is what normally keeps Ctrl+F working. But it only keeps a window
 * of pages alive — `release()` empties the text layer of anything more than a
 * few pages away — so the browser's own find sees roughly nine pages of a
 * 218-page book. The text has to be pulled from the document itself, not read
 * off the DOM.
 *
 * ── Normalisation is the whole difficulty ────────────────────────────────────
 *
 * Matching raw PDF text almost never works for this collection:
 *
 *  · Arabic is written with harakat in religious texts and typed without them.
 *    Searching "صلاة" must find "صَلاة", so vowel marks, tatweel and the
 *    superscript alef are dropped, and the alef/alef-maqsura variants folded.
 *  · A PDF breaks lines mid-sentence, so "night prayer" is often "night\nprayer"
 *    in the extracted text. Whitespace runs collapse to one space.
 *  · Latin accents are folded, so "Qur'an" and "Quran" behave the same.
 *
 * Normalising changes the length of the string, which would break every offset
 * used to build a snippet or highlight a range. So `normalize` returns the
 * folded text ALONGSIDE a map from each folded character back to the index it
 * came from in the original. Every offset that leaves this module is an offset
 * into the ORIGINAL text.
 */

/**
 * Dropped entirely. Written as escapes rather than literals: these are invisible
 * or combining characters, so a literal class is unreviewable and trivial to
 * corrupt in an editor.
 *   U+064B-U+0655  harakat (fatha, damma, kasra, shadda, sukun, madda above...)
 *   U+0670         superscript alef
 *   U+0640         tatweel (kashida) - purely typographic stretching
 *   U+200B-U+200F  zero-width space/joiners and bidi marks
 */
const DROPPED = /[\u064B-\u0655\u0670\u0640\u200B-\u200F]/;
/** Combining marks left over from an NFD decomposition (Latin accents). */
const COMBINING = /[\u0300-\u036F]/;

/** Letter variants folded together so a typed form finds a printed one. */
const FOLD: Record<string, string> = {
  'آ': 'ا', // آ -> ا
  'أ': 'ا', // أ -> ا
  'إ': 'ا', // إ -> ا
  'ٱ': 'ا', // ٱ -> ا
  'ى': 'ي', // ى -> ي
};

/**
 * The handle the search panel drives the open book through.
 *
 * Declared here rather than in BookFlipReader so the panel can import it without
 * importing the reader, which imports the panel back.
 */
export interface BookHandle {
  doc: PDFDocumentProxy;
  pageEls: HTMLElement[];
  /** Render a page if it is not already painted; resolves once its text layer exists. */
  ensure: (index: number) => Promise<void>;
  /** Jump with no animation — see `turnToPage` in types/page-flip.d.ts. */
  turnTo: (index: number) => void;
}

export interface Normalized {
  /** Folded, lower-cased, whitespace-collapsed text. */
  norm: string;
  /** `map[i]` is the index in the ORIGINAL string that produced `norm[i]`. */
  map: number[];
}

export function normalize(input: string): Normalized {
  const norm: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;
  // Where the collapsed run started. The emitted space maps back HERE, not to
  // the character that follows it — otherwise `map` quietly lies about a whole
  // class of offsets, and every invariant built on it is untestable.
  let spaceAt = -1;

  for (let i = 0; i < input.length; i++) {
    const raw = input[i];

    if (/\s/.test(raw)) {
      // Collapse runs, and never emit a leading space — a snippet that starts
      // with one looks like a bug, and it shifts every offset by one for nothing.
      if (norm.length > 0 && !pendingSpace) {
        pendingSpace = true;
        spaceAt = i;
      }
      continue;
    }
    if (DROPPED.test(raw)) continue;

    if (pendingSpace) {
      norm.push(' ');
      map.push(spaceAt);
      pendingSpace = false;
    }

    const folded = FOLD[raw] ?? raw;
    // NFD then drop combining marks: é -> e. A ligature may expand to several
    // characters, so push one map entry per emitted character, all pointing at
    // the single source index.
    for (const ch of folded.normalize('NFD')) {
      if (COMBINING.test(ch)) continue;
      norm.push(ch.toLowerCase());
      map.push(i);
    }
  }

  return { norm: norm.join(''), map };
}

/** Original-text offsets, so snippets and highlights read from the real string. */
export interface Hit {
  /** 0-based page index. */
  page: number;
  start: number;
  end: number;
  /** Snippet pieces, already whitespace-collapsed for display. */
  before: string;
  match: string;
  after: string;
}

export interface PageIndex {
  text: string;
  norm: string;
  map: number[];
}

/**
 * Pull the text of every page. This is a worker round-trip per page, so it is
 * done once per book and reported on — a 218-page book is a visible wait, and a
 * search box that looks broken for four seconds is worse than one that says
 * what it is doing.
 */
export async function buildIndex(
  doc: PDFDocumentProxy,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<PageIndex[]> {
  const pages: PageIndex[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    if (isCancelled()) return pages;
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    let text = '';
    for (const item of content.items) {
      // TextMarkedContent entries carry no `str`; only text items do.
      if (!('str' in item)) continue;
      text += item.str;
      if (item.hasEOL) text += '\n';
    }

    const { norm, map } = normalize(text);
    pages.push({ text, norm, map });
    onProgress(p, doc.numPages);
  }

  return pages;
}

const BEFORE = 44;
const AFTER = 64;
const collapse = (s: string) => s.replace(/\s+/g, ' ');

export interface SearchResult {
  hits: Hit[];
  /** True when the cap stopped the scan — the UI must SAY so rather than present
   *  a truncated list as the total. "300 matches" when there are 900 is a lie the
   *  reader has no way to detect. */
  capped: boolean;
}

/** Every occurrence of `query`, in reading order, capped so a common word cannot
 *  build a list of ten thousand rows the reader has to scroll past. */
export function findHits(index: PageIndex[], query: string, cap = 300): SearchResult {
  const needle = normalize(query).norm.trim();
  if (!needle) return { hits: [], capped: false };

  const hits: Hit[] = [];

  for (let page = 0; page < index.length; page++) {
    const { text, norm, map } = index[page];
    let from = 0;

    for (;;) {
      const at = norm.indexOf(needle, from);
      if (at === -1) break;

      const start = map[at];
      // +1 because `map` points at the first unit of the source character.
      const end = map[at + needle.length - 1] + 1;

      hits.push({
        page,
        start,
        end,
        before: collapse(text.slice(Math.max(0, start - BEFORE), start)),
        match: collapse(text.slice(start, end)),
        after: collapse(text.slice(end, end + AFTER)),
      });

      if (hits.length >= cap) return { hits, capped: true };
      from = at + needle.length;
    }
  }

  return { hits, capped: false };
}

const MARK = 'pdf-hit';

/** Unwrap any highlight previously painted under `root`, restoring the text nodes. */
export function clearHighlights(root: ParentNode): void {
  for (const mark of Array.from(root.querySelectorAll(`mark.${MARK}`))) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    mark.remove();
    // Re-join the split text nodes, so repeated search/clear cycles do not
    // shatter the layer into thousands of fragments.
    (parent as Element).normalize?.();
  }
}

/**
 * Paint `query` onto an already-rendered text layer.
 *
 * Matching runs per text node rather than across the whole layer: a DOM Range
 * that crosses element boundaries cannot be wrapped with `surroundContents`,
 * and pdf.js emits one span per text run. A phrase split across two spans is
 * therefore counted in the hit list (which reads the document text) but not
 * highlighted. The reader still lands on the right page, which is the part that
 * matters; over-engineering the cross-span case buys very little here.
 *
 * Returns how many marks were painted.
 */
export function highlight(layer: HTMLElement, query: string, activeIndexOnPage = -1): number {
  clearHighlights(layer);

  const needle = normalize(query).norm.trim();
  if (!needle) return 0;

  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  let painted = 0;

  for (const node of nodes) {
    const { norm, map } = normalize(node.data);
    const ranges: Array<[number, number]> = [];

    let from = 0;
    for (;;) {
      const at = norm.indexOf(needle, from);
      if (at === -1) break;
      ranges.push([map[at], map[at + needle.length - 1] + 1]);
      from = at + needle.length;
    }
    if (ranges.length === 0) continue;

    // Split from the end: each split invalidates offsets after it, never before.
    for (let i = ranges.length - 1; i >= 0; i--) {
      const [start, end] = ranges[i];
      const tail = node.splitText(end);
      const middle = node.splitText(start);
      const mark = document.createElement('mark');
      mark.className = MARK;
      middle.replaceWith(mark);
      mark.appendChild(middle);
      void tail;
      painted++;
    }
  }

  // Mark the one the reader jumped to, counted in document order.
  if (activeIndexOnPage >= 0) {
    const marks = layer.querySelectorAll(`mark.${MARK}`);
    marks[activeIndexOnPage]?.classList.add('is-active');
  }

  return painted;
}
