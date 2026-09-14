'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Loader2, Search } from 'lucide-react';

import { dawahApi, type DiscussionCategoryCount } from '@/lib/dawahApi';
import { localized } from './localize';

/**
 * The category view: every category that has published answers, and how many.
 *
 * Flat, because the taxonomy is flat — `dawah_categories` has no parent column, so
 * there are no subcategories to nest. Called a tree in the navigation because that
 * is what it will become; the shape here follows the data rather than promising a
 * hierarchy that does not exist.
 *
 * Selecting one hands the slug back to the page, which switches to the feed
 * filtered by it. The alternative — listing entries inside this panel — would mean
 * a second paginated list with its own state beside the one the feed already has.
 */
export function CategoryTreePanel({
  locale,
  title,
  activeSlug,
  onSelect,
  searchPlaceholder,
  answersLabel,
  emptyLabel,
}: {
  locale: string;
  title: React.ReactNode;
  activeSlug: string;
  onSelect: (slug: string) => void;
  searchPlaceholder: string;
  /** Given the count, so a language can put the number where it belongs. */
  answersLabel: (count: number) => string;
  emptyLabel: string;
}) {
  const [categories, setCategories] = useState<DiscussionCategoryCount[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    dawahApi.discussions
      .categories()
      .then((r) => !cancelled && setCategories(r))
      .catch(() => !cancelled && setCategories([]));
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Filtered here rather than on the server: the whole list is already loaded and
   * is a few dozen rows at most, so a round trip per keystroke would be slower
   * than the filter it replaces. Matched against the name in the READER's locale,
   * which is the one they are looking at.
   */
  const shown = useMemo(() => {
    if (!categories) return [];
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => localized(c, 'name', locale).toLowerCase().includes(q));
  }, [categories, query, locale]);

  return (
    <section
      aria-labelledby="categories-heading"
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
          <FolderTree className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="categories-heading" className="text-lg font-bold text-rmc-green-deep">
          {title}
        </h2>
      </div>

      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
        />
      </div>

      {categories === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-rmc-green" aria-hidden />
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shown.map((c) => {
            const selected = c.slug === activeSlug;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.slug)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border px-4 py-3 text-start transition-colors ${
                    selected
                      ? 'border-rmc-green bg-rmc-green-light/40'
                      : 'border-gray-200 bg-white hover:border-rmc-green/50'
                  }`}
                >
                  <span className="block text-sm font-bold text-gray-900">
                    {localized(c, 'name', locale)}
                  </span>
                  <span className="mt-1 block text-[11.5px] tabular-nums text-gray-500">
                    {answersLabel(c.count)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
