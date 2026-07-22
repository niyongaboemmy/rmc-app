import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { ArrowLeft, BookOpen, Clock, Globe, GraduationCap, Layers, User, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { CourseCard } from '@/components/dawah/CourseCard';
import { CourseEditBar } from '@/components/dawah/CourseEditBar';
import { CourseInlineText } from '@/components/dawah/CourseInlineText';
import { CourseLessons } from '@/components/dawah/CourseLessons';
import { type OutlineLesson } from '@/components/dawah/CourseLessonBrowser';
import { localized } from '@/components/dawah/localize';
import { dawahApi, type DawahCourse } from '@/lib/dawahApi';
import { fileUrl } from '@/lib/api';
import { parseMediaEmbed } from '@/lib/dawah/media';

export const dynamic = 'force-dynamic';

/**
 * React.cache dedupes this within a single request: generateMetadata and the
 * page body both need the course, and without it we would fetch every course
 * page twice. Returns null instead of throwing so the caller decides between
 * notFound() and empty metadata.
 */
const getCourse = cache(async (slug: string): Promise<DawahCourse | null> => {
  try {
    return await dawahApi.courses.bySlug(slug);
  } catch {
    // 404 (not found, or a draft — the API refuses to distinguish them) and a
    // backend that is simply down both land here.
    return null;
  }
});

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const course = await getCourse(slug);
  if (!course) return {};

  const title = localized(course, 'title', locale);
  const description = localized(course, 'summary', locale);
  // The cover lives on the PUBLIC file-server prefix, so a crawler that has
  // never authenticated can still fetch it for the card preview.
  const image = course.coverImageKey ? fileUrl(course.coverImageKey) : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CourseDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations('dawah');
  const course = await getCourse(slug);

  // Unpublished courses 404 from the API, and a 404 here is the correct public
  // answer for a draft: it must not be discoverable by guessing its slug.
  if (!course) notFound();

  const title = localized(course, 'title', locale);
  const summary = localized(course, 'summary', locale);
  const category = course.category ? localized(course.category, 'name', locale) : null;

  // TipTap output from the admin editor. SANITISED — see the report: the blog's
  // public renderer does NOT do this, which is a real gap in that page, not a
  // convention worth copying.
  const description = sanitizeRichHtml(localized(course, 'description', locale));
  const hasDescription = Boolean(
    description.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim(),
  );

  // Resolve the locale AND sanitise here, on the server, then hand the accordion
  // plain strings. CourseLessonBrowser is a client component and must never import
  // isomorphic-dompurify itself — see the comment on OutlineLesson.
  const lessons: OutlineLesson[] = [...(course.lessons ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((lesson) => ({
      id: lesson.id,
      title: localized(lesson, 'title', locale),
      summary: localized(lesson, 'summary', locale),
      bodyHtml: sanitizeRichHtml(localized(lesson, 'body', locale)),
      durationMinutes: lesson.durationMinutes,
      contentType: lesson.contentType,
      mediaUrl: lesson.mediaUrl,
      // Audio lives under the PUBLIC dawah-media/ prefix — resolve the file-server
      // URL here on the server so the client just gets a plain, seekable src.
      mediaSrc: lesson.mediaKey ? fileUrl(lesson.mediaKey) : null,
    }));

  // Related: same category, minus this course. Best-effort — a failure here must
  // not take down a page that has already loaded successfully.
  let related: DawahCourse[] = [];
  if (course.category?.slug) {
    try {
      const result = await dawahApi.courses.list({
        category: course.category.slug,
        limit: 4,
      });
      related = result.items.filter((c) => c.id !== course.id).slice(0, 3);
    } catch {
      related = [];
    }
  }

  const meta = [
    { icon: GraduationCap, value: t(`courses.level.${course.level}`) },
    { icon: Globe, value: t(`courses.language.${course.language}`) },
    { icon: BookOpen, value: t(`courses.format.${course.format}`) },
    { icon: Layers, value: t('courses.lessonCount', { count: course.lessonCount }) },
    ...(course.durationMinutes
      ? [{ icon: Clock, value: t('courses.duration', { minutes: course.durationMinutes }) }]
      : []),
    // Learner count — social proof, shown only once the course has takers.
    ...(course.enrollmentCount > 0
      ? [{ icon: Users, value: t('courses.enrolled', { count: course.enrollmentCount }) }]
      : []),
  ];

  // ── schema.org/Course structured data ────────────────────────────────────
  // A dawah catalogue exists to be found in search; this is a materially useful
  // win. JSON.stringify drops undefined keys, so absent fields simply vanish.
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const cover = course.coverImageKey ? fileUrl(course.coverImageKey) : undefined;
  const plainSummary = summary.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: plainSummary || undefined,
    url: siteUrl ? `${siteUrl}/${locale}/dawah/courses/${course.slug}` : undefined,
    inLanguage: course.language === 'multi' ? ['en', 'rw', 'ar'] : course.language,
    image: cover,
    provider: {
      '@type': 'Organization',
      name: 'Rwanda Muslim Community',
      url: siteUrl || undefined,
    },
    // Free, self-paced offering — the two fields Google's Course enrichment wants.
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: course.format === 'in_person' ? 'onsite' : 'online',
      ...(course.durationMinutes ? { courseWorkload: `PT${course.durationMinutes}M` } : {}),
    },
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'RWF',
      availability: 'https://schema.org/InStock',
      category: 'Free',
    },
  };

  // VideoObject / AudioObject structured data for media lessons — a discovery win
  // for a dawah catalogue. Built from the raw lessons (they carry uploadDate) and
  // emitted as a @graph only when media exists. JSON.stringify drops undefined.
  const uploadDate = course.publishedAt ?? course.createdAt;
  const mediaGraph = (course.lessons ?? [])
    .map((lesson) => {
      const name = localized(lesson, 'title', locale);
      const description = localized(lesson, 'summary', locale) || undefined;
      const duration = lesson.durationMinutes ? `PT${lesson.durationMinutes}M` : undefined;
      if (lesson.contentType === 'video' && lesson.mediaUrl) {
        const embed = parseMediaEmbed(lesson.mediaUrl);
        if (!embed) return null;
        return {
          '@type': 'VideoObject',
          name,
          description,
          embedUrl: embed.embedUrl,
          thumbnailUrl: embed.thumbnailUrl ?? cover,
          uploadDate,
          duration,
        };
      }
      if (lesson.contentType === 'audio' && lesson.mediaKey) {
        return {
          '@type': 'AudioObject',
          name,
          description,
          contentUrl: fileUrl(lesson.mediaKey),
          uploadDate,
          duration,
        };
      }
      return null;
    })
    .filter(Boolean);
  const mediaJsonLd = mediaGraph.length
    ? { '@context': 'https://schema.org', '@graph': mediaGraph }
    : null;

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {mediaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mediaJsonLd) }}
        />
      )}
      <Navbar solid />
      <main className="bg-white">
        {/* No image hero: a course page is for reading. Just the back link here;
            the title now lives at the top of the header card below, together with
            the instructor and meta. pt clears the fixed navbar (56/64px) and
            leaves a 16px gap beneath it. */}
        <section className="pt-[72px] md:pt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link
              href={`/${locale}/dawah/courses`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {t('courses.backToCourses')}
            </Link>
          </div>
        </section>

        <section className="bg-white py-3 md:py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Header card: title, instructor and meta. Sits in normal
                document flow — it scrolls away with the page rather than
                pinning to the top. ── */}
            <Reveal>
              <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                {/* Admin-only "Edit course" button for the STRUCTURAL fields
                    (description, cover, instructor, level…); renders nothing
                    outside edit mode. Title & summary edit inline below. */}
                <CourseEditBar course={course} />
                {/* Title block */}
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-green">
                  {category ?? t('title')}
                </p>
                <CourseInlineText
                  as="h1"
                  courseId={course.id}
                  field="title"
                  value={title}
                  locale={locale}
                  className="mt-1 block text-lg font-bold leading-tight text-rmc-green-deep md:text-xl"
                />
                <CourseInlineText
                  as="p"
                  courseId={course.id}
                  field="summary"
                  value={summary}
                  locale={locale}
                  className="mt-1.5 block max-w-2xl text-sm leading-snug text-gray-500"
                  readClassName="line-clamp-2"
                  placeholder={t('courses.subtitle')}
                />

                {/* Instructor + meta, divided from the title above */}
                <div className="mt-3 flex flex-col gap-3 border-t border-gray-200 pt-3 md:flex-row md:items-center md:justify-between">
                  {course.instructorName && (
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white ring-2 ring-rmc-gold/30">
                        <User className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                          {t('courses.instructor')}
                        </p>
                        <p className="truncate text-sm font-bold text-gray-900">
                          {course.instructorName}
                        </p>
                        {course.instructorTitle && (
                          <p className="truncate text-xs text-gray-500">{course.instructorTitle}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {meta.map(({ icon: Icon, value }) => (
                      <div key={value} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Icon className="h-4 w-4 text-rmc-green" aria-hidden />
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Reveal>

            {/* ── Course content: nav on the left, the selected entry on the
                right. The description is the first entry ("About this course")
                rather than its own stacked section — one region, not two. ── */}
            {/* Deliberately NOT wrapped in <Reveal>: .reveal keeps a transform
                even once visible, and a transformed ancestor becomes the
                containing block for the sticky lesson nav inside, which silently
                breaks its pin.

                CourseLessons is the reader for everyone; for a dawah:manage admin
                it adds an in-place "Manage lessons" toggle. It renders nothing for
                a visitor when the course has neither lessons nor a description. */}
            <div className="mt-6">
              <CourseLessons
                lessons={lessons}
                overviewHtml={hasDescription ? description : ''}
                courseSlug={course.slug}
                courseId={course.id}
              />
            </div>

            {/* ── Related ─────────────────────────────────────────────────── */}
            {related.length > 0 && (
              <Reveal>
                <div className="mt-10">
                  <h2 className="text-lg font-bold text-rmc-green-deep md:text-xl">
                    {t('courses.related')}
                  </h2>
                  <span
                    aria-hidden
                    className="mt-2 mb-6 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
                  />
                  {/* Landscape, matching the listing at /dawah/courses — a reader
                      arrives here from that list, so the cards should not change
                      shape under them. Two-up, because a landscape row needs the
                      width; three-up would leave the text ~230px. A lone related
                      course is capped rather than stretched across a 2-col track,
                      which would leave a gaping empty half. */}
                  <div
                    className={
                      related.length === 1
                        ? 'grid max-w-2xl gap-4'
                        : 'grid gap-4 lg:grid-cols-2'
                    }
                  >
                    {related.map((c) => (
                      <CourseCard key={c.id} course={c} locale={locale} />
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
