import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Eye, MessageSquare, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { localized } from '@/components/dawah/localize';
import { dawahApi, type DiscussionThread, type PostLanguage } from '@/lib/dawahApi';
import { AnswerComposer } from '@/components/dawah/AnswerComposer';

export const dynamic = 'force-dynamic';

/** A post's own direction. NOT the page's — see the component comment. */
const dirOf = (language: PostLanguage) => (language === 'ar' ? 'rtl' : 'ltr');

/**
 * React.cache dedupes within a request: generateMetadata and the page body both need the
 * thread, and without it every view fetches twice. Returns null so the caller chooses
 * between notFound() and empty metadata.
 */
const getThread = cache(async (slug: string): Promise<DiscussionThread | null> => {
  try {
    return await dawahApi.discussions.bySlug(slug);
  } catch {
    // 404 (missing, hidden, auto-hidden, locked — the API refuses to distinguish them)
    // and a backend that is simply down both land here. That conflation is deliberate on
    // the API side: a status code must not leak a moderation decision.
    return null;
  }
});

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const thread = await getThread(slug);
  if (!thread) return {};
  const { question } = thread;
  // Strip the rendered HTML for the description — never a slice of raw markdown.
  const description = question.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  return {
    title: question.title,
    description,
    openGraph: { title: question.title, description, type: 'article', locale },
  };
}

/**
 * One discussion thread.
 *
 * ── The verified answer is the point of the page ─────────────────────────────────────
 *
 * It renders first, in gold, with the scholar's name. Everything below it is explicitly
 * labelled "community answers" and styled subordinate. A reader who scans and leaves must
 * take away RMC's answer, not the most upvoted one — the API already sorts verified-first,
 * and this page must not undo that visually.
 *
 * ── dir comes from the POST, not the page ───────────────────────────────────────────
 *
 * An Arabic question read on the English page is still Arabic. `dir` is set per post from
 * its `language` column. Driving it from the page locale would put Arabic punctuation on
 * the wrong side for the only reader who can actually read it.
 */
export default async function DiscussionThreadPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations('dawah');
  const thread = await getThread(slug);
  if (!thread) notFound();

  const { question, answers } = thread;
  const category = question.category ? localized(question.category, 'name', locale) : null;
  const verified = answers.find((a) => a.isVerified);
  const community = answers.filter((a) => !a.isVerified);

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
              dir={dirOf(question.language)}
              className="mt-1.5 text-xl font-bold leading-snug text-rmc-green-deep md:text-2xl"
            >
              {question.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                {question.author ? (
                  <span className="text-gray-600">{question.author.name}</span>
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

            <span
              aria-hidden
              className="mt-4 block h-px w-full rounded-full bg-gradient-to-r from-rmc-gold/40 to-transparent"
            />
          </div>
        </section>

        <section className="bg-white py-6">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* The question body. bodyHtml is rendered AND sanitised server-side by the
                API — the client never renders markdown, and never trusts a member's HTML. */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
                <div
                  dir={dirOf(question.language)}
                  className="prose prose-sm md:prose-base max-w-none text-gray-600 prose-p:leading-[1.65] prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
                  dangerouslySetInnerHTML={{ __html: question.bodyHtml }}
                />
              </div>
            </Reveal>

            {/* ── The verified answer, first and unmistakable ─────────────── */}
            {verified && (
              <Reveal>
                <div className="mt-6 rounded-lg border border-rmc-gold/40 bg-rmc-gold/[0.04] p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rmc-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rmc-gold-light">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                      {t('discussions.verifiedBadge')}
                    </span>
                    {/* Name the scholar. "Verified by RMC" with nobody behind it is an
                        institution hiding behind itself. */}
                    {verified.verifiedBy && (
                      <span className="text-[11px] text-gray-500">
                        {t('discussions.verifiedBy', { name: verified.verifiedBy.name })}
                      </span>
                    )}
                  </div>
                  <div
                    dir={dirOf(verified.language)}
                    className="prose prose-sm md:prose-base mt-3 max-w-none text-gray-700 prose-p:leading-[1.65] prose-a:text-rmc-green"
                    dangerouslySetInnerHTML={{ __html: verified.bodyHtml }}
                  />
                  <p className="mt-3 text-[11px] text-gray-500">
                    {verified.author ? verified.author.name : t('discussions.anonymousAnswer')}
                  </p>
                </div>
              </Reveal>
            )}

            {/* ── Community answers, explicitly subordinate ───────────────── */}
            <Reveal>
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t('discussions.communityAnswers')}
                </h2>
                <span
                  aria-hidden
                  className="mt-2 mb-4 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
                />

                {community.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                    {t('discussions.noAnswersYet')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {community.map((a) => (
                      <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
                        <div
                          dir={dirOf(a.language)}
                          className="prose prose-sm max-w-none text-gray-600 prose-p:leading-[1.65] prose-a:text-rmc-green"
                          dangerouslySetInnerHTML={{ __html: a.bodyHtml }}
                        />
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                          <UserRound className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                          {a.author ? (
                            <>
                              <span className="text-gray-600">{a.author.name}</span>
                              {a.author.isScholar && (
                                <span className="rounded-full bg-rmc-green-light px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-rmc-green">
                                  {t('discussions.scholar')}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="italic text-gray-400">{t('discussions.anonymousAnswer')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            {/* Compose. A client island in this server page. It knows whether the
                category holds answers for review, so it can warn before submit. */}
            <AnswerComposer
              slug={question.slug}
              language={question.language}
              scholarReview={(question.category?.answerPolicy ?? 'scholar_review') === 'scholar_review'}
              locked={question.status === 'locked'}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
