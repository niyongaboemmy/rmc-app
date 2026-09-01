'use client';

import { BadgeCheck, FolderTree, MessagesSquare } from 'lucide-react';

/** Which panel the main column is showing. Mirrors `?view=` in the URL. */
export type DiscussionsView = 'new' | 'essential' | 'categories';

const ITEMS: { view: DiscussionsView; Icon: typeof MessagesSquare }[] = [
  { view: 'categories', Icon: FolderTree },
  { view: 'essential', Icon: BadgeCheck },
  { view: 'new', Icon: MessagesSquare },
];

/**
 * The listing's left rail: which of the three views the main column shows.
 *
 * ── Why the state is in the URL, not in this component ──────────────────────
 *
 * The rest of this page already keeps search, category and page in the query
 * string on the principle that a result set should be shareable and survive Back.
 * A view that lived in component state would break both — someone linking a
 * colleague to the curated set would send them the feed instead.
 *
 * ── Below `lg` it is a horizontal strip, not a drawer ───────────────────────
 *
 * Three items do not earn a hamburger. Laid across the top they cost one row and
 * stay visible, where a drawer would hide the page's primary navigation behind a
 * tap and leave a reader on a phone unsure the other views exist.
 */
export function DiscussionsSidebar({
  active,
  onChange,
  labels,
}: {
  active: DiscussionsView;
  onChange: (view: DiscussionsView) => void;
  /** Translated; the panel headings themselves come from the CMS. */
  labels: Record<DiscussionsView, string>;
}) {
  return (
    <nav
      aria-label={labels.categories}
      className="flex gap-1.5 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:p-3"
    >
      {ITEMS.map(({ view, Icon }) => {
        const selected = view === active;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition-colors lg:w-full ${
              selected
                ? 'bg-rmc-green-light text-rmc-green'
                : 'text-gray-600 hover:bg-gray-50 hover:text-rmc-green'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap lg:whitespace-normal">{labels[view]}</span>
          </button>
        );
      })}
    </nav>
  );
}
