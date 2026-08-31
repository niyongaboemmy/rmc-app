'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, Loader2 } from 'lucide-react';

import { dawahApi, type DawahCategory, type DiscussionListItem } from '@/lib/dawahApi';
import { localized } from './localize';

/** A category with the curated entries filed under it. */
interface Group {
  key: string;
  label: string;
  items: DiscussionListItem[];
}

/** Entries an admin curated but never categorised still have to go somewhere. */
const UNFILED = '__unfiled__';

/**
 * "The Essential Answers" — the curated set beside the chronological feed.
 *
 * ── Why it fetches once and groups on the client ─────────────────────────────
 *
 * The curated set is small by definition: it is what RMC chose, not what exists.
 * One request for all of it, grouped here, means switching tabs is instant and a
 * reader browsing four categories costs one round trip rather than four. If the
 * collection ever grows past a few dozen this should become a request per tab —
 * `limit` below is the tripwire, not a guess at the real size.
 *
 * The tabs are derived from the entries rather than from the category list: a
 * category with nothing curated in it would be a tab that opens onto an empty
 * panel, which reads as a bug rather than as an editorial choice.
 */
export function EssentialAnswersPanel({
  locale,
  title,
  body,
  seeAllHref,
  renderItem,
}: {
  locale: string;
  /** Rendered by the caller so it can be inline-editable in Edit Mode. */
  title: React.ReactNode;
  body: React.ReactNode;
  seeAllHref: string;
  /** The caller owns the row, so the two panels cannot drift apart visually. */
  renderItem: (item: DiscussionListItem) => React.ReactNode;
}) {
  const [items, setItems] = useState<DiscussionListItem[] | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dawahApi.discussions
      .list({ essential: 'true', limit: 50 })
      .then((r) => !cancelled && setItems(r.items))
      // An empty array, not null: a curated panel that failed to load and one that
      // has nothing in it look the same to a reader, and neither is worth an error.
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<Group[]>(() => {
    if (!items?.length) return [];
    const byKey = new Map<string, Group>();
    for (const item of items) {
      const category = item.category as DawahCategory | null;
      const key = category?.id ?? UNFILED;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: category ? localized(category, 'name', locale) : '',
          items: [],
        });
      }
      byKey.get(key)!.items.push(item);
    }
    const all = Array.from(byKey.values());
    // Uncategorised last: it is a gap in the curation, not a category anyone
    // deliberately browses to.
    return all
      .filter((g) => g.key !== UNFILED)
      .concat(all.filter((g) => g.key === UNFILED));
  }, [items, locale]);

  // Only once the groups exist, and only if the reader has not already chosen —
  // resetting to the first tab on every re-render would fight them.
  useEffect(() => {
    if (active === null && groups.length) setActive(groups[0].key);
  }, [groups, active]);

  const current = groups.find((g) => g.key === active) ?? groups[0];

  return (
    <section
      aria-labelledby="essential-heading"
      className="rounded-2xl border border-rmc-green/15 bg-rmc-green-light/30 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-rmc-green ring-1 ring-rmc-green/15">
          <BadgeCheck className="h-5 w-5" aria-hidden />
        </span>
        <h2
          id="essential-heading"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-lg font-bold text-rmc-green-deep"
        >
          {title}
          {/* The whole collection, as its own filtered listing. */}
          <Link
            href={seeAllHref}
            className="shrink-0 text-rmc-green/60 transition-colors hover:text-rmc-green"
            aria-label="Open the full collection"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        </h2>
      </div>

      <div className="mt-3 text-[13px] leading-relaxed text-gray-600">{body}</div>

      {items === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-rmc-green" aria-hidden />
        </div>
      ) : groups.length === 0 ? null : (
        <>
          {/* Horizontally scrolling tabs.
              `overflow-x-auto` with no direction of its own: the browser reverses
              the scroll axis under `dir="rtl"` on its own, so an Arabic reader
              starts at the right-hand tab without any of this knowing about it.
              Snap points make a half-scrolled tab settle rather than hang. */}
          <div
            role="tablist"
            aria-label="Categories"
            className="mt-4 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]"
          >
            {groups.map((g) => {
              const selected = g.key === current?.key;
              return (
                <button
                  key={g.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActive(g.key)}
                  className={`shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    selected
                      ? 'bg-rmc-green text-white shadow-sm'
                      : 'bg-white/70 text-gray-600 hover:bg-white'
                  }`}
                >
                  {g.label || 'Other'}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2.5">
            {current?.items.map((item) => (
              <div key={item.id}>{renderItem(item)}</div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
