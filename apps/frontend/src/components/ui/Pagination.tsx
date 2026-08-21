'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Numbered pagination.
 *
 * Arrows alone tell a reader they can step, never where they are in the set or how to
 * jump — on a knowledge base that is browsed rather than read through, page 7 has to be
 * one click away from page 1.
 *
 * The window keeps first and last always visible with the current page and its
 * neighbours, and elides the rest, so the control is a fixed width whether there are
 * five pages or five hundred.
 */

/** Page numbers to render, with `null` standing in for an elision. */
export function pageWindow(page: number, pages: number, edge = 1): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const out: (number | null)[] = [1];
  const from = Math.max(2, page - edge);
  const to = Math.min(pages - 1, page + edge);

  // A gap of exactly one page is spelled out rather than elided — "1 … 3" hides a page
  // while spending the same width as "1 2 3".
  if (from > 2) out.push(from === 3 ? 2 : null);
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pages - 1) out.push(to === pages - 2 ? pages - 1 : null);

  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pages,
  onChange,
  labels,
  className = '',
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  /** Translated; the numbers name themselves inside the labelled nav. */
  labels: { previous: string; next: string; nav: string };
  className?: string;
}) {
  if (pages <= 1) return null;

  const step =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label={labels.nav} className={`flex items-center justify-center gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={labels.previous}
        className={step}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </button>

      {pageWindow(page, pages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            // aria-current is what tells a screen reader which page it is on; the
            // colour alone says it only to people who can see it.
            aria-current={p === page ? 'page' : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
              p === page
                ? 'border-rmc-green bg-rmc-green font-semibold text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label={labels.next}
        className={step}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </button>
    </nav>
  );
}
