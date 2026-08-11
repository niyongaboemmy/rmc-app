import { getTranslations } from 'next-intl/server';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { BookOpen } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { CourseCard } from '@/components/dawah/CourseCard';
import { DiscussionCard } from '@/components/dawah/DiscussionCard';
import {
  DawahHero,
  DawahIntro,
  DawahCoursesHeading,
  DawahBrowseCoursesButton,
  DawahCtaCards,
  DawahDiscussionsHeading,
  DawahDiscussionsCtas,
} from '@/components/dawah/DawahLandingSections';
import {
  WhatIsDawah,
  WhyDawahMatters,
  CorePrinciples,
  HowPracticed,
  DawahFaq,
  DawahFinalCta,
} from '@/components/dawah/DawahAboutSections';
import { getDawahContent, getFeaturedCourses, getRecentDiscussions } from '@/components/dawah/dawahData';
import { pick } from '@/lib/content-api';

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
  const [content, featured, discussions] = await Promise.all([
    getDawahContent(),
    getFeaturedCourses(),
    getRecentDiscussions(),
  ]);

  // The description body is HTML from the admin rich-text editor, so it is
  // sanitised before it is ever rendered. An empty editor saves "<p></p>", so
  // test for actual text rather than a non-empty string — otherwise a cleared
  // section renders an empty grey box.
  const descriptionHtml = sanitizeRichHtml(pick(content.description.body, locale));
  const hasDescription = Boolean(
    descriptionHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim(),
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero — CMS copy, inline-editable ────────────────────────────── */}
        <DawahHero />

        {/* ── Educational sections — explain the concept of Dawah to a
            first-time visitor. Static, fully-translated copy (dawah.about.*). ── */}
        <Reveal>
          <WhatIsDawah />
        </Reveal>
        <Reveal>
          <WhyDawahMatters />
        </Reveal>
        <Reveal>
          <CorePrinciples />
        </Reveal>
        <Reveal>
          <HowPracticed />
        </Reveal>

        {/* ── Description — CMS rich text; eyebrow/title inline-editable ───── */}
        {hasDescription && (
          <Reveal>
            <DawahIntro bodyHtml={descriptionHtml} />
          </Reveal>
        )}

        {/* ── Outline of courses — live from /dawah/courses/featured ──────── */}
        <Reveal>
          <section className="bg-gray-50/60 py-14 lg:py-16">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
              <DawahCoursesHeading />

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

                  <DawahBrowseCoursesButton />
                </>
              ) : (
                /* `outlineEmpty`, NOT `courses.empty` — that one reads "try
                   clearing your filters", which is advice for the listing page.
                   There are no filters here, so it would be nonsense.

                   This is also the backend-down state. It says "nothing to show
                   right now", never "there are no courses" — from here we cannot
                   tell an empty catalogue from an unreachable one, and claiming
                   the former would be a lie on a bad day. */
                <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
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
          <section className="bg-white py-14 lg:py-16">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
              <DawahCtaCards />
            </div>
          </section>
        </Reveal>

        {/* ── Recent discussions — newest questions from the community ─────── */}
        {discussions.length > 0 && (
          <Reveal>
            <section className="bg-gray-50/60 py-14 lg:py-16">
              <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
                <DawahDiscussionsHeading />

                <div className="mt-12 grid gap-4 md:grid-cols-2">
                  {discussions.map((q) => (
                    <DiscussionCard key={q.id} question={q} locale={locale} />
                  ))}
                </div>

                <DawahDiscussionsCtas />
              </div>
            </section>
          </Reveal>
        )}

        {/* ── FAQ — common questions about Dawah ──────────────────────────── */}
        <Reveal>
          <DawahFaq />
        </Reveal>

        {/* ── Closing call-to-action — get involved ───────────────────────── */}
        <Reveal>
          <DawahFinalCta />
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
