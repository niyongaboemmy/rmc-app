'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { DiscussionQuestion } from '@/lib/dawahApi';
import { localized } from './localize';

/** Locale → the name of that language, in ITS OWN language. A reader looking for
 *  Kinyarwanda questions is looking for the word "Kinyarwanda", not "Ikinyarwanda"
 *  translated into Arabic. */
const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  ar: 'العربية',
};

/** First ~180 characters of RMC's answer, with the HTML stripped — the static variant. */
function answerExcerpt(answerHtml: string): string {
  const text = answerHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

/**
 * One Q&A entry, as an accordion row: the question is the header, RMC's answer is the panel.
 *
 * ── Why the answer is inline rather than behind a link ───────────────────────────────
 *
 * The list IS the product. Someone scanning for "can I combine prayers when travelling"
 * wants the ruling, and making them load a page per question turns a five-second scan into
 * five navigations. The list payload already carries `answerHtml`, so expanding costs no
 * request — the answer is on the page before the reader asks for it.
 *
 * The permalink survives inside the panel: entries are shareable and indexable, and the
 * detail page remains the canonical URL. The accordion is a faster way through the same
 * content, not a replacement for it.
 *
 * ── Independent toggles, not one-at-a-time ──────────────────────────────────────────
 *
 * Opening one entry does not close another. The tidier single-open variant means a reader
 * comparing two rulings loses the first the moment they open the second, and content
 * disappearing from under you is a worse cost than a long page.
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
}: {
  question: DiscussionQuestion;
  locale: string;
  /**
   * Show when the answer was published, in the meta row. Off by default: the Dawah
   * landing shows a handful of recent entries where the date adds nothing, while the
   * listing is a chronological index where it is how a reader places an answer.
   */
  showDate?: boolean;
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
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-rmc-green/50"
    >
      {meta}
      <h3
        dir={dir}
        className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green"
      >
        {question.title}
      </h3>
      <span
        aria-hidden
        className="mt-1.5 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
      />
      <p dir={dir} className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">
        {answerExcerpt(question.answerHtml)}
      </p>
    </Link>
  );
}
