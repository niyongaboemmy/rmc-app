import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { ArrowRight, BookOpen, Library, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { CourseCard } from '@/components/dawah/CourseCard';
import { getDawahContent, getFeaturedCourses } from '@/components/dawah/dawahData';
import { pick, isRtl } from '@/lib/content-api';

// Hero and description are CMS-managed and the course outline is live API data,
// so an admin's edit must show on the next request. Never statically cached.
export const dynamic = 'force-dynamic';

export default async function DawahPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('dawah');

  // Both loaders swallow their own failures — see dawahData.ts. The page renders
  // with seeded copy and an empty outline when the backend is down, rather than
  // 500ing. Fetched in parallel: neither depends on the other.
  const [content, featured] = await Promise.all([getDawahContent(), getFeaturedCourses()]);

  const rtl = isRtl(locale);

  // The description body is HTML from the admin rich-text editor, so it is
  // sanitised before it is ever rendered. An empty editor saves "<p></p>", so
  // test for actual text rather than a non-empty string — otherwise a cleared
  // section renders an empty grey box.
  const descriptionHtml = sanitizeRichHtml(pick(content.description.body, locale));
  const hasDescription = Boolean(
    descriptionHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim(),
  );

  // Own copy, not a re-render of the courses section heading above — see the
  // comment on DawahContent.cta.
  const ctaCards = [
    { href: `/${locale}/dawah/courses`, icon: BookOpen, ...content.cta.courses },
    { href: `/${locale}/dawah/library`, icon: Library, ...content.cta.library },
  ].map((card) => ({
    href: card.href,
    icon: card.icon,
    eyebrow: pick(card.eyebrow, locale),
    title: pick(card.title, locale),
    body: pick(card.subtitle, locale),
    cta: pick(card.action, locale),
  }));

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero — CMS copy ─────────────────────────────────────────────── */}
        <PageHero
          eyebrow={pick(content.hero.eyebrow, locale)}
          title={pick(content.hero.title, locale)}
          subtitle={pick(content.hero.subtitle, locale)}
          ornament
        />

        {/* ── Description — CMS rich text ─────────────────────────────────── */}
        {hasDescription && (
          <Reveal>
            <section className="bg-white py-16 lg:py-20">
              <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
                <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/70 p-6 shadow-sm sm:p-8 lg:p-10">
                  <div
                    className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.04]"
                    aria-hidden
                  />
                  {/* Logical `-end-6` so the gold bloom sits in the outer corner
                      in both directions rather than jumping across in Arabic. */}
                  <div
                    className="pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full bg-rmc-gold/10 blur-2xl"
                    aria-hidden
                  />

                  <div className="relative">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green">
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                          {pick(content.description.eyebrow, locale)}
                        </p>
                        <h2 className="text-xl font-bold text-rmc-green-deep md:text-2xl">
                          {pick(content.description.title, locale)}
                        </h2>
                      </div>
                    </div>

                    <div
                      dir={rtl ? 'rtl' : 'ltr'}
                      className="prose prose-sm md:prose-base max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* ── Outline of courses — live from /dawah/courses/featured ──────── */}
        <Reveal>
          <section className="bg-gray-50/60 py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold">
                  {pick(content.courses.eyebrow, locale)}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-rmc-green-deep md:text-3xl">
                  {pick(content.courses.title, locale)}
                </h2>
                <div className="ornament-divider mx-auto my-4 max-w-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
                </div>
                <p className="text-sm leading-relaxed text-gray-500">
                  {pick(content.courses.subtitle, locale)}
                </p>
              </div>

              {featured.length > 0 ? (
                <>
                  {/* Landscape, matching /dawah/courses and the related strip — a
                      reader moving between them should see one card, not three
                      variants. Two-up because a landscape row needs the width. */}
                  <div className="mt-12 grid gap-4 lg:grid-cols-2">
                    {featured.map((course) => (
                      <CourseCard key={course.id} course={course} locale={locale} />
                    ))}
                  </div>

                  <div className="mt-10 text-center">
                    <Link
                      href={`/${locale}/dawah/courses`}
                      className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-green-dark"
                    >
                      {pick(content.courses.cta, locale)}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  </div>
                </>
              ) : (
                /* `outlineEmpty`, NOT `courses.empty` — that one reads "try
                   clearing your filters", which is advice for the listing page.
                   There are no filters here, so it would be nonsense.

                   This is also the backend-down state. It says "nothing to show
                   right now", never "there are no courses" — from here we cannot
                   tell an empty catalogue from an unreachable one, and claiming
                   the former would be a lie on a bad day. */
                <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rmc-green-light text-rmc-green">
                    <BookOpen className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="mt-4 font-semibold text-gray-900">
                    {t('courses.outlineEmpty.title')}
                  </p>
                  <p className="mt-1.5 text-sm text-gray-500">{t('courses.outlineEmpty.body')}</p>
                </div>
              )}
            </div>
          </section>
        </Reveal>

        {/* ── CTA cards → Courses and Library ─────────────────────────────── */}
        <Reveal>
          <section className="bg-white py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
              <div className="grid gap-6 md:grid-cols-2">
                {ctaCards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-gray-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.18)] transition-all duration-300 hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_28px_64px_-24px_rgba(26,122,74,0.3)]"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.03]"
                      aria-hidden
                    />

                    <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
                      <card.icon className="h-7 w-7" aria-hidden />
                    </span>

                    <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold">
                      {card.eyebrow}
                    </p>
                    <h3 className="relative mt-1.5 text-xl font-bold text-gray-900">{card.title}</h3>
                    <span
                      aria-hidden
                      className="relative mt-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
                    />
                    <p className="relative mt-4 text-sm leading-relaxed text-gray-500">{card.body}</p>

                    <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green">
                      {card.cta}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
