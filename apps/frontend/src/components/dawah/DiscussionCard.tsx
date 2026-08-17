'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BadgeCheck, CalendarDays, ChevronDown, ExternalLink, Eye, UserRound } from 'lucide-react';
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
  open,
  onToggle,
  showDate = false,
}: {
  question: DiscussionQuestion;
  locale: string;
  /**
   * Accordion state. Omit BOTH to get the static variant — a link to the entry with an
   * excerpt of the answer, for the Dawah landing page, which is a server component and
   * cannot hold the open state a disclosure needs. One component, because a teaser that
   * looked like a different product would be worse than a branch.
   */
  open?: boolean;
  onToggle?: () => void;
  /**
   * Show when the answer was published, in the meta row. Off by default: the Dawah
   * landing shows a handful of recent entries where the date adds nothing, while the
   * listing is a chronological index where it is how a reader places an answer.
   */
  showDate?: boolean;
}) {
  const t = useTranslations('dawah');
  const category = question.category ? localized(question.category, 'name', locale) : null;
  const isForeign = question.language !== locale;
  const dir = question.language === 'ar' ? 'rtl' : 'ltr';
  const panelId = `answer-${question.id}`;
  const headerId = `question-${question.id}`;

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
    </span>
  );

  if (!onToggle) {
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

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition-colors ${
        open ? 'border-rmc-green/40' : 'border-gray-200'
      }`}
    >
      {/* A real <button>, so the row is reachable and operable from the keyboard for free.
          aria-expanded is what tells a screen reader this is a disclosure rather than a
          link that did nothing. */}
      <button
        type="button"
        id={headerId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-gray-50/70"
      >
        <span className="min-w-0 flex-1">
          {meta}

          <span
            dir={dir}
            className={`mt-1 block text-[15px] font-bold leading-snug transition-colors ${
              open ? 'text-rmc-green' : 'text-gray-900'
            }`}
          >
            {question.title}
          </span>
        </span>

        <ChevronDown
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Kept mounted and collapsed with a grid-rows transition rather than unmounted: the
          height animates without measuring anything, and the markup stays in the document
          for in-page find. `invisible` (not `hidden`) keeps it out of the tab order while
          collapsed. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className={`overflow-hidden ${open ? '' : 'invisible'}`}>
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <span
              aria-hidden
              className="mb-3 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
            />

            {/* Rendered AND sanitised server-side — the client renders no markdown and
                never trusts stored HTML. */}
            <div
              dir={dir}
              className="prose prose-sm max-w-none text-gray-600 prose-p:leading-[1.65] prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
              dangerouslySetInnerHTML={{ __html: question.answerHtml }}
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5 text-rmc-gold-light">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                {t('discussions.answerBadge')}
              </span>

              {question.answeredBy && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  <span className="text-gray-600">{question.answeredBy.name}</span>
                  {question.answeredBy.isScholar && (
                    <span className="rounded-full bg-rmc-green-light px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-rmc-green">
                      {t('discussions.scholar')}
                    </span>
                  )}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                {t('discussions.views', { count: question.viewCount })}
              </span>

              {/* PUBLISHED date, not answered. The listing is ordered by publishedAt —
                  showing answeredAt instead makes a correctly sorted list read as
                  unsorted, because a question answered in July can be published in June
                  and vice versa. The date shown must be the key the list is sorted by. */}
              {showDate && (question.publishedAt ?? question.createdAt) && (
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  {new Date(
                    (question.publishedAt ?? question.createdAt) as string,
                  ).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              )}

              <Link
                href={`/${locale}/dawah/discussions/${question.slug}`}
                className="ms-auto inline-flex items-center gap-1 font-semibold text-rmc-green hover:underline"
              >
                {t('discussions.openEntry')}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
