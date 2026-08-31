'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

import { dawahApi, type DiscussionListItem } from '@/lib/dawahApi';

/** Enough to be a shortlist. A long one stops being "most read" and becomes a second feed. */
const LIMIT = 5;

/**
 * "Most-Read" — the entries readers actually open, beneath the chronological feed.
 *
 * ── What this is, and what it is not ─────────────────────────────────────────
 *
 * A view count records what has been OPENED, not what is worth opening. An entry
 * that ranked well early keeps accruing views for that reason alone, so this is a
 * shortlist beside the feed rather than the feed's own order — see DISCUSSION_SORTS.
 * It sits below "New Answers" for the same reason: a reader should meet what is new
 * before what is popular, or the popular entries are all that ever gets read.
 *
 * Its own fetch, independent of the feed's filters. Searching the feed must not
 * empty this panel: the two answer different questions, and a "most read" list that
 * changes when you type is not a most-read list.
 */
export function MostReadPanel({
  locale,
  title,
  renderItem,
}: {
  locale: string;
  /** Rendered by the caller so it stays inline-editable in Edit Mode. */
  title: React.ReactNode;
  /** The caller owns the row, so the panels cannot drift apart visually. */
  renderItem: (item: DiscussionListItem) => React.ReactNode;
}) {
  const [items, setItems] = useState<DiscussionListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    dawahApi.discussions
      .list({ sort: 'popular', limit: LIMIT })
      // An empty array rather than null: a panel that failed to load and one with
      // nothing in it look the same to a reader, and neither is worth an error.
      .then((r) => !cancelled && setItems(r.items))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Nothing read yet is not a state worth announcing — the panel simply is not there.
  if (items?.length === 0) return null;

  return (
    <section
      aria-labelledby="most-read-heading"
      className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
          <BarChart3 className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="most-read-heading" className="text-lg font-bold text-rmc-green-deep">
          {title}
        </h2>
      </div>

      {items === null ? (
        <div className="grid gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </section>
  );
}
