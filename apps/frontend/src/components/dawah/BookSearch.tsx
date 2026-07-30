'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Loader2, Search, X } from 'lucide-react';
import {
  buildIndex, clearHighlights, findHits, highlight,
  type BookHandle, type Hit, type PageIndex,
} from './pdfSearch';

/**
 * Search inside the open book.
 *
 * Replaces the browser's Ctrl+F rather than supplementing it: the reader only
 * keeps a few pages' text layers alive, so the native find genuinely cannot see
 * the book (see pdfSearch.ts). Intercepting the shortcut is the honest move —
 * leaving it to a find bar that silently searches nine pages of two hundred is
 * worse than taking it over.
 *
 * The page text is extracted once, on first open, and kept for the life of the
 * reader. Doing it up front would tax every reader for a feature most never use;
 * doing it per keystroke would re-walk the whole document on every letter.
 */
export function BookSearch({
  book,
  registerOnPageRendered,
}: {
  book: BookHandle | null;
  registerOnPageRendered: (fn: ((index: number, page: HTMLElement) => void) | null) => void;
}) {
  const t = useTranslations('dawah');

  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [capped, setCapped] = useState(false);
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState<number | null>(null);

  const indexRef = useRef<PageIndex[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  // Read inside the page-rendered callback, which is registered once and would
  // otherwise capture the first render's values forever.
  const liveRef = useRef({ query: '', hits: [] as Hit[], active: -1 });
  useEffect(() => { liveRef.current = { query, hits, active }; }, [query, hits, active]);

  // ── Index, built once per book ────────────────────────────────────────────
  const ensureIndex = useCallback(async () => {
    if (!book || indexRef.current) return;
    cancelledRef.current = false;
    setProgress(0);
    const pages = await buildIndex(
      book.doc,
      (done, total) => setProgress(Math.round((done / total) * 100)),
      () => cancelledRef.current,
    );
    if (cancelledRef.current) return;
    indexRef.current = pages;
    setProgress(null);
  }, [book]);

  useEffect(() => {
    // A new book invalidates the old text entirely.
    indexRef.current = null;
    cancelledRef.current = true;
    setHits([]);
    setActive(-1);
    setQuery('');
    setRaw('');
    setProgress(null);
  }, [book]);

  useEffect(() => () => { cancelledRef.current = true; }, []);

  // One search per pause, not per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(raw), 200);
    return () => clearTimeout(id);
  }, [raw]);

  useEffect(() => {
    if (!open) return;
    let stale = false;
    void (async () => {
      await ensureIndex();
      if (stale || !indexRef.current) return;
      const found = query.trim()
        ? findHits(indexRef.current, query)
        : { hits: [], capped: false };
      setHits(found.hits);
      setCapped(found.capped);
      setActive(found.hits.length ? 0 : -1);
    })();
    return () => { stale = true; };
  }, [query, open, ensureIndex]);

  // ── Painting ──────────────────────────────────────────────────────────────
  const paint = useCallback((pageIndex: number, pageEl: HTMLElement) => {
    const { query: q, hits: hs, active: a } = liveRef.current;
    const layer = pageEl.querySelector<HTMLElement>('.textLayer');
    if (!layer) return;
    if (!q.trim()) { clearHighlights(layer); return; }
    // Which hit on THIS page is the active one, so only it gets the strong colour.
    const current = hs[a];
    const onPage = current && current.page === pageIndex
      ? hs.filter((h) => h.page === pageIndex).indexOf(current)
      : -1;
    highlight(layer, q, onPage);
  }, []);

  // Re-paint whenever a page's text layer is (re)built — `release()` empties it
  // when the page drifts out of the window, so returning to it loses the marks.
  useEffect(() => {
    registerOnPageRendered((index, pageEl) => paint(index, pageEl));
    return () => registerOnPageRendered(null);
  }, [registerOnPageRendered, paint]);

  const goTo = useCallback(async (i: number) => {
    if (!book || i < 0 || i >= hits.length) return;
    const hit = hits[i];
    setActive(i);
    liveRef.current = { ...liveRef.current, active: i };
    book.turnTo(hit.page);
    await book.ensure(hit.page);
    const el = book.pageEls[hit.page];
    if (el) paint(hit.page, el);
  }, [book, hits, paint]);

  // Repaint the pages already on screen when the query or active hit changes.
  useEffect(() => {
    if (!book) return;
    book.pageEls.forEach((el, i) => {
      if (el.querySelector('.textLayer')?.childNodes.length) paint(i, el);
    });
  }, [book, query, active, paint]);

  const close = useCallback(() => {
    setOpen(false);
    setRaw('');
    setQuery('');
    setHits([]);
    setActive(-1);
    if (book) for (const el of book.pageEls) {
      const layer = el.querySelector<HTMLElement>('.textLayer');
      if (layer) clearHighlights(layer);
    }
  }, [book]);

  // ── Shortcuts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.select());
        return;
      }
      if (e.key === 'Escape' && open) {
        // Stop here: the reader overlay also closes on Escape, and dismissing
        // the whole book because someone wanted to leave the find bar is rude.
        e.stopPropagation();
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [book, open, close]);

  const grouped = useMemo(() => {
    const byPage = new Map<number, number>();
    for (const h of hits) byPage.set(h.page, (byPage.get(h.page) ?? 0) + 1);
    return byPage.size;
  }, [hits]);

  if (!book) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
        title={t('library.reader.search')}
        aria-label={t('library.reader.search')}
        className="absolute end-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-lg bg-black/60 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  const indexing = progress !== null;

  return (
    <div
      // Tells PreviewOverlayShell that Escape belongs to this panel while it is
      // open, so dismissing the find bar does not close the whole book.
      data-escape-capture="true"
      className="absolute end-3 top-3 z-20 flex max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-white/10 bg-gray-900/95 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2.5 py-2">
        <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <input
          ref={inputRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); void goTo(e.shiftKey ? active - 1 : active + 1); }
          }}
          placeholder={t('library.reader.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          autoComplete="off"
          spellCheck={false}
        />
        {hits.length > 0 && (
          <span className="shrink-0 text-[11px] tabular-nums text-white/40">
            {active + 1}/{hits.length}
          </span>
        )}
        <button
          type="button"
          onClick={() => void goTo(active - 1)}
          disabled={active <= 0}
          aria-label={t('library.reader.prevMatch')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => void goTo(active + 1)}
          disabled={active < 0 || active >= hits.length - 1}
          aria-label={t('library.reader.nextMatch')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label={t('library.close')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/60 transition-colors hover:bg-red-500/40 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {indexing ? (
          <p className="flex items-center gap-2 px-3 py-4 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('library.reader.indexing', { percent: progress ?? 0 })}
          </p>
        ) : !query.trim() ? (
          <p className="px-3 py-4 text-xs leading-relaxed text-white/40">
            {t('library.reader.searchHint')}
          </p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-4 text-xs text-white/40">{t('library.reader.noMatches')}</p>
        ) : (
          <>
            <p className="px-3 pt-2.5 text-[11px] uppercase tracking-[0.12em] text-white/30">
              {capped
                ? t('library.reader.matchSummaryCapped', { matches: hits.length })
                : t('library.reader.matchSummary', { matches: hits.length, pages: grouped })}
            </p>
            <ul className="p-1.5">
              {hits.map((h, i) => (
                <li key={`${h.page}-${h.start}`}>
                  <button
                    type="button"
                    onClick={() => void goTo(i)}
                    className={`w-full rounded-md px-2 py-1.5 text-start text-xs leading-relaxed transition-colors ${
                      i === active ? 'bg-rmc-green/25 text-white' : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <span className="me-1.5 rounded bg-white/10 px-1 py-0.5 text-[10px] tabular-nums text-white/50">
                      {t('library.reader.pageShort', { page: h.page + 1 })}
                    </span>
                    <span className="text-white/40">…{h.before}</span>
                    <mark className="rounded-sm bg-rmc-gold/40 px-0.5 text-white">{h.match}</mark>
                    <span className="text-white/40">{h.after}…</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
