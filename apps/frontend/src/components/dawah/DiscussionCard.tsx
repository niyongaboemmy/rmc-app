import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MessageSquare, Eye, BadgeCheck, UserRound } from 'lucide-react';
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

/**
 * One question in the Discussions list.
 *
 * The house style the rest of Dawah settled on: rounded-lg (8px), border-gray-200, no
 * shadow. A card that looks different here would read as a different product.
 *
 * `dir` comes from the QUESTION's language, never the page locale — an Arabic question in
 * the English listing is still Arabic and still reads right-to-left. Getting this wrong
 * puts the punctuation on the wrong side and looks like a rendering bug to the one reader
 * who can actually read it.
 */
export function DiscussionCard({
  question,
  locale,
}: {
  question: DiscussionQuestion;
  locale: string;
}) {
  const t = useTranslations('dawah');
  const category = question.category ? localized(question.category, 'name', locale) : null;
  const isForeign = question.language !== locale;

  return (
    <Link
      href={`/${locale}/dawah/discussions/${question.slug}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-rmc-green/50"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {category && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {category}
          </span>
        )}
        {/* Only badge the language when it is NOT the page's — otherwise every card on
            the English page shouts "English" and the signal is noise. */}
        {isForeign && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
            {LANGUAGE_LABEL[question.language] ?? question.language}
          </span>
        )}
        {question.verifiedAnswerId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rmc-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-rmc-gold-light">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            {t('discussions.verifiedBadge')}
          </span>
        )}
      </div>

      {/* The title is the member's own words: its direction follows the post. */}
      <h3
        dir={question.language === 'ar' ? 'rtl' : 'ltr'}
        className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green"
      >
        {question.title}
      </h3>

      <span
        aria-hidden
        className="mt-1.5 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-gray-400" aria-hidden />
          {/* author === null IS anonymity — there is no flag to check. */}
          {question.author ? (
            <>
              <span className="text-gray-600">{question.author.name}</span>
              {question.author.isScholar && (
                <span className="rounded-full bg-rmc-green-light px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-rmc-green">
                  {t('discussions.scholar')}
                </span>
              )}
            </>
          ) : (
            <span className="italic text-gray-400">{t('discussions.anonymous')}</span>
          )}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-rmc-green" aria-hidden />
          {t('discussions.answers', { count: question.answerCount })}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-gray-400" aria-hidden />
          {t('discussions.views', { count: question.viewCount })}
        </span>
      </div>
    </Link>
  );
}
