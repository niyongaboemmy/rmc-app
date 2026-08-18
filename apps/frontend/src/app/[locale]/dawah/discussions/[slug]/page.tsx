import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Eye } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { localized } from '@/components/dawah/localize';
import { QuestionRating } from '@/components/dawah/QuestionRating';
import { dawahApi, type DiscussionQuestion, type PostLanguage } from '@/lib/dawahApi';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** An entry's own direction. NOT the page's — see the component comment. */
const dirOf = (language: PostLanguage) => (language === 'ar' ? 'rtl' : 'ltr');

/**
 * React.cache dedupes within a request: generateMetadata and the page body both need the
 * entry, and without it every view fetches twice. Returns null so the caller chooses
 * between notFound() and empty metadata.
 */
const getEntry = cache(async (slug: string): Promise<DiscussionQuestion | null> => {
  try {
    return await dawahApi.discussions.bySlug(slug);
  } catch {
    // 404 (missing, pending, rejected, hidden — the API refuses to distinguish them) and a
    // backend that is simply down both land here. That conflation is deliberate on the API
    // side: a status code must not reveal that RMC declined to answer someone.
    return null;
  }
});

/**
 * Up to three entries to read next. Never throws: a related-list that 404s or times out
 * must not take down the answer the reader actually came for, so a failure renders as no
 * rail at all.
 */
const getRelated = cache(async (slug: string) => {
  try {
    const { items } = await dawahApi.discussions.related(slug);
    return items;
  } catch {
    return [];
  }
});

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const entry = await getEntry(slug);
  if (!entry) return {};
  // Describe with the ANSWER, not the question: a search result should show what RMC said,
  // which is the thing worth clicking. Strip the rendered HTML — never a slice of markdown.
  const description = entry.answerHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return {
    title: entry.title,
    description,
    openGraph: { title: entry.title, description, type: 'article', locale },
  };
}

/**
 * One Q&A entry: a question, and RMC's answer to it.
 *
 * ── There is no asker on this page ───────────────────────────────────────────────────
 *
 * Not hidden, not anonymised — absent. The API never sends one. A published entry is
 * RMC's answer to a question the community raised, and whose name was attached to the
 * raising of it is not part of the published record.
 *
 * ── dir comes from the ENTRY, not the page ──────────────────────────────────────────
 *
 * An Arabic entry read on the English page is still Arabic. `dir` is set from its
 * `language` column. Driving it from the page locale would put Arabic punctuation on the
 * wrong side for the only reader who can actually read it.
 */
export default async function DiscussionEntryPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations('dawah');
  // In parallel: the related list resolves the slug independently, so it does not have to
  // wait on the entry it sits beside.
  const [entry, related] = await Promise.all([getEntry(slug), getRelated(slug)]);
  if (!entry) notFound();

  const category = entry.category ? localized(entry.category, 'name', locale) : null;

  return (
    <div className="min-h-screen">
      {/* solid: this page opens straight onto white, and the navbar's links are white. */}
      <Navbar solid />
      <main>
        <section className="pt-24 md:pt-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Link
              href={`/${locale}/dawah/discussions`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-rmc-green"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {t('discussions.backToDiscussions')}
            </Link>

            {category && (
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-rmc-gold">
                {category}
              </p>
            )}

            <h1
              dir={dirOf(entry.language)}
              className="mt-1.5 text-xl font-bold leading-snug text-rmc-green-deep md:text-2xl"
            >
              {entry.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                {t('discussions.views', { count: entry.viewCount })}
              </span>
              {entry.publishedAt && (
                <time dateTime={entry.publishedAt}>
                  {new Date(entry.publishedAt).toLocaleDateString(locale)}
                </time>
              )}
            </div>

            <span
              aria-hidden
              className="mt-4 block h-px w-full rounded-full bg-gradient-to-r from-rmc-gold/40 to-transparent"
            />
          </div>
        </section>

        <section className="bg-white py-6">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* The question. Rendered AND sanitised server-side by the API — the client
                never renders markdown, and never trusts stored HTML. */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
                <div
                  dir={dirOf(entry.language)}
                  className="prose prose-sm md:prose-base max-w-none text-gray-600 prose-p:leading-[1.65] prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
                  dangerouslySetInnerHTML={{ __html: entry.bodyHtml }}
                />
              </div>
            </Reveal>

            {/* ── RMC's answer ────────────────────────────────────────────── */}
            <Reveal>
              <div className="mt-6 rounded-lg border border-rmc-gold/40 bg-rmc-gold/[0.04] p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rmc-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rmc-gold-light">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    {t('discussions.answerBadge')}
                  </span>
                  {/* Name the person. An institution hiding behind itself is exactly what
                      naming the answerer prevents. */}
                  {entry.answeredBy && (
                    <span className="text-[11px] text-gray-500">
                      {t('discussions.answeredBy', { name: entry.answeredBy.name })}
                    </span>
                  )}
                </div>
                <div
                  dir={dirOf(entry.language)}
                  className="prose prose-sm md:prose-base mt-3 max-w-none text-gray-700 prose-p:leading-[1.65] prose-a:text-rmc-green"
                  dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
                />
              </div>
            </Reveal>

            {/* Rating belongs to the answer, so it sits with it rather than at the foot of
                the page: by the time a reader has scrolled past the ask-your-own CTA they
                have left the answer behind. Outside <Reveal>, whose transform would
                otherwise animate a control the reader may already be reaching for. */}
            <QuestionRating slug={slug} />

            {/* Where to go next, before the ask-your-own CTA: a reader whose question was
                already answered here should meet the neighbouring answers first, and only
                then the invitation to ask something new. Server-rendered, so these are
                crawlable links between entries rather than a client-side afterthought. */}
            {related.length > 0 && (
              <Reveal>
                <section className="mt-8" aria-labelledby="related-heading">
                  <h2
                    id="related-heading"
                    className="text-sm font-bold uppercase tracking-[0.12em] text-rmc-green-deep"
                  >
                    {t('discussions.related.title')}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {related.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/${locale}/dawah/discussions/${item.slug}`}
                          className="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-rmc-green/40 hover:bg-rmc-green/[0.02]"
                        >
                          {/* Per-entry dir, exactly as the title above: an Arabic entry
                              listed on the English page is still Arabic. */}
                          <span
                            dir={dirOf(item.language)}
                            className="min-w-0 flex-1 text-sm text-gray-700 transition-colors group-hover:text-rmc-green"
                          >
                            {item.title}
                          </span>
                          <ArrowRight
                            className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-rmc-green rtl:rotate-180"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            )}

            <Reveal>
              <div className="mt-8 rounded-lg border border-dashed border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">{t('discussions.askPrompt')}</p>
                <Link
                  href={`/${locale}/dawah/discussions/ask`}
                  className="mt-3 inline-flex items-center rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                >
                  {t('discussions.askCta')}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
