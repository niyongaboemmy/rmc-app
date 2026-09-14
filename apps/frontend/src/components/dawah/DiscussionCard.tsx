'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, Check, Download, Eye, Share2 } from 'lucide-react';
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
  showViews = false,
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
  /**
   * Show how many times the entry has been opened, opposite the actions.
   *
   * For the Most-Read panel, where the count is the reason the row is there — it
   * is what the ordering claims, so showing it lets the reader check the claim.
   * Off elsewhere: on the feed it would invite reading the list as a ranking when
   * it is ordered by date.
   */
  showViews?: boolean;
}) {
  const t = useTranslations('dawah');
  const [copied, setCopied] = useState(false);

  const href = `/${locale}/dawah/discussions/${question.slug}`;

  /**
   * The native share sheet where there is one, the clipboard where there is not.
   *
   * `navigator.share` exists on phones and almost nowhere on the desktop, so the
   * fallback is the common path rather than the exception — and it is the same
   * clipboard idiom five other components already use.
   *
   * An absolute URL: what gets shared has to work when pasted somewhere else, and
   * `href` alone is a path. Built at click time because `window` does not exist
   * when this renders on the server.
   */
  const share = useCallback(async () => {
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: question.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A dismissed share sheet rejects, and so does a clipboard the browser has
      // not granted. Neither is a failure worth interrupting the reader over.
    }
  }, [href, question.title]);

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
    </span>
  );

  /** PUBLISHED date, not answered: the listing is ordered by publishedAt, and a date
   *  that is not the sort key makes a sorted list read as unsorted. */
  const stamp = question.publishedAt ?? question.createdAt;

  return (
    <article
      className={`group rounded-lg border border-gray-200 bg-white transition-colors duration-200 hover:border-rmc-green/50 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* The LINK stops at the reading content. It used to wrap the whole card, which
          is why the listing had to float its moderation buttons on top — a button
          inside an anchor is a nested interactive element, and clicking it would also
          navigate. The actions below are real buttons, so the anchor has to end first. */}
      <Link href={href} className="block">
        {meta}
        <h3
          dir={dir}
          className="mt-1.5 line-clamp-2 [overflow-wrap:anywhere] text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green"
        >
          {question.title}
        </h3>
        {!compact && (
          <>
            <span
              aria-hidden
              className="mt-1.5 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
            />
            <p dir={dir} className="mt-2 line-clamp-3 [overflow-wrap:anywhere] text-[13px] leading-relaxed text-gray-600">
              {question.summary}
            </p>
          </>
        )}
      </Link>

      <div
        data-print-hide
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-2.5"
      >
        {/* Download opens the ENTRY and prints it, because a card cannot meaningfully
            print itself out of a list — the reader wants the answer, which is not on
            this row. `?print=1` is what the detail page reads to raise the dialog. */}
        <Link
          href={`${href}?print=1`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-gray-500 transition-colors hover:text-rmc-green"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t('discussions.download')}
        </Link>

        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-gray-500 transition-colors hover:text-rmc-green"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-rmc-green" aria-hidden />
          ) : (
            <Share2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? t('discussions.linkCopied') : t('discussions.share')}
        </button>

        {showViews ? (
          <span className="ms-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-gray-400">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {/* Grouped by the reader's own locale — 2,981,255 or ٢٬٩٨١٬٢٥٥ — because a
                seven-digit run with no separators is unreadable in any of them. */}
            {question.viewCount.toLocaleString(locale)}
          </span>
        ) : (
          showDate &&
          stamp && (
            <span className="ms-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-gray-400">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {new Date(stamp as string).toLocaleDateString(locale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          )
        )}
      </div>
    </article>
  );
}
