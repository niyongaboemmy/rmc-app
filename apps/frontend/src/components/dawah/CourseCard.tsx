'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpen, Clock, GraduationCap, Layers, Users } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import type { DawahCourse } from '@/lib/dawahApi';
import { localized } from './localize';

/** Level → the pill's colour. Beginner reads calm, advanced reads earned. */
const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  intermediate: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  advanced: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};

/**
 * One course, everywhere one is shown: the /dawah landing grid, the full listing
 * at /dawah/courses, and the related strip on a course page. One shape on all
 * three — a reader moving between them should see the same card, not variants.
 *
 * (This briefly carried a `layout` prop with a second, portrait rendering. Once
 * every caller settled on landscape the portrait branch was unreachable, so it
 * went; `git log` has it if a tall showcase card is ever wanted again.)
 *
 * A client component for one reason: the cover-image fallback. `coverImageKey`
 * is nullable, so a course with no cover is normal and expected — but a key
 * that points at a file the admin later deleted is ALSO expected, and only the
 * browser finds that out. Handling just the null case would still leave a
 * broken-image glyph on the page, which is the single most likely visible
 * defect in this feature. `onError` needs the client, so the card lives there.
 */
export function CourseCard({ course, locale }: { course: DawahCourse; locale: string }) {
  const t = useTranslations('dawah');
  const [coverFailed, setCoverFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * onError alone is NOT enough, and this is the subtle part.
   *
   * The card is server-rendered, so the <img> is already in the HTML when the
   * browser starts parsing. A dangling key 404s immediately — typically BEFORE
   * React hydrates and attaches its onError handler — so the error event fires
   * into a void and React never hears about it. The result is a broken-image
   * glyph that no amount of onError will ever clear. (Verified: it renders
   * exactly that way without this effect.)
   *
   * So on mount we ask the DOM what already happened: an <img> that has
   * finished loading (`complete`) but has no pixels (`naturalWidth === 0`)
   * failed. onError still handles the post-hydration case — a cover deleted
   * while the page is open, or a slow 404 that lands after hydration.
   */
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth === 0) setCoverFailed(true);
  }, []);

  const title = localized(course, 'title', locale);
  const summary = localized(course, 'summary', locale);
  const category = course.category ? localized(course.category, 'name', locale) : null;

  const showCover = Boolean(course.coverImageKey) && !coverFailed;

  return (
    /* A `flex` row with no explicit direction, so it follows the writing
       direction: the thumbnail sits on the left in English and mirrors to the
       right in Arabic, which is where the eye starts in each. */
    <Link
      href={`/${locale}/dawah/courses/${course.slug}`}
      className="group flex h-full items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/50"
    >
      {/* Fixed width, full height: the thumbnail stretches to whatever the text
          beside it needs, so a row is never part-empty. */}
      <div className="relative w-28 shrink-0 overflow-hidden bg-rmc-green-deep sm:w-36 lg:w-40">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={fileUrl(course.coverImageKey as string)}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        ) : (
          /* The fallback. Not a placeholder image — a deliberate branded tile, so
             a cover-less course looks intentional rather than broken. Most of this
             catalogue has no cover, so this is the common case, not the edge case. */
          <div
            aria-hidden
            className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-deep"
          >
            <div className="absolute inset-0 pattern-islamic opacity-[0.12]" />
            <BookOpen className="relative h-6 w-6 text-white/70" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset ${
              LEVEL_STYLES[course.level] ?? LEVEL_STYLES.beginner
            }`}
          >
            <GraduationCap className="h-3 w-3" />
            {t(`courses.level.${course.level}`)}
          </span>
          {/* Category sits in the body, not on the tile: on a 112px mobile
              thumbnail a chip like "New Muslims" overflows its own tile. */}
          {category && (
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {category}
            </span>
          )}
        </div>

        {/* Primary text */}
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900">{title}</h3>

        {/* Gold hairline — the house accent. */}
        <span
          aria-hidden
          className="mt-1.5 block h-px w-10 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
        />

        {/* Secondary text */}
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-gray-500">{summary}</p>

        {course.instructorName && (
          <p className="mt-1.5 truncate text-[11px] text-gray-400">
            {t('courses.instructor')}: <span className="text-gray-600">{course.instructorName}</span>
          </p>
        )}

        {/* Meta row pinned to the bottom, so rows align however long the title runs. */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-rmc-green" />
            {t('courses.lessonCount', { count: course.lessonCount })}
          </span>
          {course.durationMinutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-rmc-green" />
              {t('courses.duration', { minutes: course.durationMinutes })}
            </span>
          ) : null}
          {/* Learner count as social proof — shown only once a course has takers,
              so a brand-new course reads "0 learners" nowhere. */}
          {course.enrollmentCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-rmc-green" />
              {t('courses.learners', { count: course.enrollmentCount })}
            </span>
          ) : null}
          {/* ms-auto — trailing edge in both directions. */}
          <span className="ms-auto inline-flex shrink-0 items-center gap-1 font-semibold text-rmc-green opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {t('courses.view')}
            {/* rtl:rotate-180 — the arrow must point the way the language reads. */}
            <ArrowRight className="h-3 w-3 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </Link>
  );
}
