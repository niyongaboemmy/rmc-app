'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { DiscussionListItem } from '@/lib/dawahApi';
import { localized } from './localize';

/** Locale → the name of that language, in ITS OWN language. A reader looking for
 *  Kinyarwanda questions is looking for the word "Kinyarwanda", not "Ikinyarwanda"
 *  translated into Arabic. */
const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  ar: 'العربية',
};

/**
 * One Q&A entry in the listing: title, a short summary, and a link to the full answer.
 *
 * ── Why the summary is authored rather than derived ──────────────────────────────────
 *
 * This row used to strip the tags off `answerHtml` and cut at 180 characters. It cut
 * mid-sentence, read as truncation rather than a summary, and no admin could improve it —
 * and it forced the list endpoint to return every full answer in order to show a fragment
 * of each. `summary` is written by whoever wrote the ruling, and the list no longer
 * carries the answers at all.
 *
 * The server still substitutes a derived excerpt when an entry has no authored summary, so
 * this always has something to show; it never needs to handle a blank.
 *
 * `dir` comes from the ENTRY's language, never the page locale — an Arabic entry in the
 * English listing is still Arabic and still reads right-to-left. Getting this wrong puts
 * the punctuation on the wrong side and looks like a rendering bug to the one reader who
 * can actually read it.
 */
export function DiscussionCard({
  question,
  locale,
  showDate = false,
  compact = false,
}: {
  question: DiscussionListItem;
  locale: string;
  /**
   * Show when the answer was published, in the meta row. Off by default: the Dawah
   * landing shows a handful of recent entries where the date adds nothing, while the
   * listing is a chronological index where it is how a reader places an answer.
   */
  showDate?: boolean;
  /**
   * Drop the summary and the rule under the title.
   *
   * For the curated panel, which is a column of titles to pick from rather than a
   * feed to read: at that width three lines of summary per row turns eight entries
   * into a page of scrolling, and the reader is choosing, not reading.
   */
  compact?: boolean;
}) {
  const category = question.category ? localized(question.category, 'name', locale) : null;
  const isForeign = question.language !== locale;
  const dir = question.language === 'ar' ? 'rtl' : 'ltr';

  const meta = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {category && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          {category}
        </span>
      )}
      {/* Only badge the language when it is NOT the page's — otherwise every row on the
          English page shouts "English" and the signal is noise. */}
      {isForeign && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
          {LANGUAGE_LABEL[question.language] ?? question.language}
        </span>
      )}
      {/* PUBLISHED date, not answered: the listing is ordered by publishedAt, and a date
          that is not the sort key makes a sorted list read as unsorted. */}
      {showDate && (question.publishedAt ?? question.createdAt) && (
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
          <CalendarDays className="h-3 w-3" aria-hidden />
          {new Date(
            (question.publishedAt ?? question.createdAt) as string,
          ).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      )}
    </span>
  );

  return (
    <Link
      href={`/${locale}/dawah/discussions/${question.slug}`}
      className={`group block rounded-lg border border-gray-200 bg-white transition-colors duration-200 hover:border-rmc-green/50 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {meta}
      <h3
        dir={dir}
        className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green"
      >
        {question.title}
      </h3>
      {!compact && (
        <>
          <span
            aria-hidden
            className="mt-1.5 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
          />
          <p dir={dir} className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">
            {question.summary}
          </p>
        </>
      )}
    </Link>
  );
}
