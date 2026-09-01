import { cache, Suspense } from 'react';
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
import { PrintOnLoad } from '@/components/dawah/PrintOnLoad';
import { AnswerContents } from '@/components/dawah/AnswerContents';
import { dawahApi, type DiscussionQuestion, type PostLanguage } from '@/lib/dawahApi';
import {
  ContentKeys, DISCUSSIONS_DEFAULT, mergeContent, pick, type DiscussionsContent,
} from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
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
  // The summary IS the description: a short prose statement of what RMC said, which is
  // the thing worth clicking in a search result. It replaced a second copy of the
  // strip-the-HTML-and-cut routine that the listing also carried — and unlike that, it
  // is written rather than truncated, so it ends on a sentence.
  const description = entry.summary.slice(0, 160);
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
  // wait on the entry it sits beside, and the CMS read is a per-request cached hit on the
  // same whole-store fetch the layout already made.
  const [entry, related, saved] = await Promise.all([
    getEntry(slug),
    getRelated(slug),
    fetchSiteContent([ContentKeys.discussions]),
  ]);
  if (!entry) notFound();

  /**
   * Admin-editable chrome, merged over the seeded defaults.
   *
   * Read server-side and rendered directly — no provider, because the only client
   * component here is the rating widget and it takes the two strings it needs as props.
   * Handing it the whole blob instead would serialise every listing string into this
   * page's HTML for two fields.
   */
  const cms = mergeContent<DiscussionsContent>(
    DISCUSSIONS_DEFAULT,
    saved[ContentKeys.discussions],
  ).detail;

  const category = entry.category ? localized(entry.category, 'name', locale) : null;

  return (
    <div className="min-h-screen">
      {/* solid: this page opens straight onto white, and the navbar's links are white. */}
      <Navbar solid />
      {/* Raises the print dialog when the listing's Download link brought the reader
          here. In Suspense because it reads searchParams, which opts a server
          component into dynamic rendering unless the boundary absorbs it. */}
      <Suspense fallback={null}>
        <PrintOnLoad />
      </Suspense>
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
              className="mt-1.5 [overflow-wrap:anywhere] text-xl font-bold leading-snug text-rmc-green-deep md:text-2xl"
            >
              {entry.title}
            </h1>

            {/* The authored summary, as a lede. Plain text, so no renderer and no
                sanitiser — and the server substitutes a derived excerpt when nobody
                has written one, so this is never empty on a published entry. */}
            {entry.summary && (
              <p
                dir={dirOf(entry.language)}
                className="mt-3 [overflow-wrap:anywhere] text-[15px] leading-relaxed text-gray-600 md:text-base"
              >
                {entry.summary}
              </p>
            )}

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
            {/* The question's extra detail. Rendered AND sanitised server-side by the
                API — the client never renders markdown, and never trusts stored HTML.

                Only when there IS detail: an admin-authored entry has none, because
                its title is the whole question, and an empty bordered box under the
                heading reads as something that failed to load. */}
            {entry.bodyHtml.trim() && (
              <Reveal>
                <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
                  <div
                    dir={dirOf(entry.language)}
                    className="prose prose-sm md:prose-base max-w-none text-gray-600 prose-p:leading-[1.65] prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
                    dangerouslySetInnerHTML={{ __html: entry.bodyHtml }}
                  />
                </div>
              </Reveal>
            )}

            {/* ── RMC's answer ────────────────────────────────────────────── */}
            <Reveal>
              <div
                className={`rounded-lg border border-rmc-gold/40 bg-rmc-gold/[0.04] p-4 md:p-5 ${
                  entry.bodyHtml.trim() ? 'mt-6' : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rmc-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rmc-gold-light">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    {pick(cms.answerBadge, locale)}
                  </span>
                  {/* The answer is RMC's, and the badge above says so. Who wrote it is
                      not shown: a ruling carries the institution's authority, not an
                      individual's, and naming one person invites them to be approached
                      about it directly. The answerer is still recorded, and still visible
                      to admins in the Q&A library. */}
                </div>
                {/* The ruling in short, before its reasoning. Plain text, so no
                    renderer and no sanitiser; absent when nobody wrote one, and
                    nothing stands in for it — a derived one would just repeat the
                    lede a few lines above. */}
                {entry.answerSummary && (
                  <p
                    dir={dirOf(entry.language)}
                    className="mt-3 [overflow-wrap:anywhere] border-s-2 border-rmc-gold/40 ps-3 text-[15px] font-medium leading-relaxed text-gray-800"
                  >
                    {entry.answerSummary}
                  </p>
                )}
                {/* Outcome, then map, then detail: the short ruling above, the
                    contents here, the answer itself below. */}
                <AnswerContents
                  toc={entry.answerToc}
                  label={t('discussions.contents')}
                  dir={dirOf(entry.language)}
                />
                <div
                  dir={dirOf(entry.language)}
                  className="prose prose-sm md:prose-base mt-3 max-w-none text-gray-700 prose-p:leading-[1.65] prose-a:text-rmc-green prose-headings:scroll-mt-24"
                  dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
                />
              </div>
            </Reveal>

            {/* Rating belongs to the answer, so it sits with it rather than at the foot of
                the page: by the time a reader has scrolled past the ask-your-own CTA they
                have left the answer behind. Outside <Reveal>, whose transform would
                otherwise animate a control the reader may already be reaching for. */}
            <div data-print-hide>
              <QuestionRating
                slug={slug}
                copy={{
                  prompt: pick(cms.ratingPrompt, locale),
                  thanks: pick(cms.ratingThanks, locale),
                  suggestPrompt: pick(cms.ratingSuggestPrompt, locale),
                  reasonPrompt: pick(cms.ratingReasonPrompt, locale),
                  reasons: pick(cms.ratingReasons, locale),
                }}
              />
            </div>

            {/* Where to go next, before the ask-your-own CTA: a reader whose question was
                already answered here should meet the neighbouring answers first, and only
                then the invitation to ask something new. Server-rendered, so these are
                crawlable links between entries rather than a client-side afterthought. */}
            {related.length > 0 && (
              <Reveal>
                <section data-print-hide className="mt-8" aria-labelledby="related-heading">
                  <h2
                    id="related-heading"
                    className="text-sm font-bold uppercase tracking-[0.12em] text-rmc-green-deep"
                  >
                    {pick(cms.relatedTitle, locale)}
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
                <p className="text-sm text-gray-500">{pick(cms.askPrompt, locale)}</p>
                <Link
                  href={`/${locale}/dawah/discussions/ask`}
                  className="mt-3 inline-flex items-center rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                >
                  {pick(cms.askCta, locale)}
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
