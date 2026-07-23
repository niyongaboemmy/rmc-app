'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, FileText, Headphones,
  Info, Link2, Video,
} from 'lucide-react';
import { LessonVideo } from './LessonVideo';
import { LessonAudio } from './LessonAudio';
import { LessonResource } from './LessonResource';
import { useAuth } from '@/hooks/useAuth';
import { dawahApi } from '@/lib/dawahApi';

/**
 * One lesson, already resolved to a single locale and already SANITISED.
 *
 * The sanitising happens on the server, in the page, and the clean HTML arrives
 * here as a string. This component must NOT import isomorphic-dompurify:
 * next.config.js lists it under serverComponentsExternalPackages because it
 * bundles jsdom, so importing it from a 'use client' module makes the whole
 * component resolve to `undefined` in the browser bundle and the page 500s with
 * "Element type is invalid". That is why bodyHtml is a pre-cleaned string.
 */
export interface OutlineLesson {
  id: string;
  title: string;
  summary: string;
  /** Sanitised HTML. Empty string when the lesson has no body. */
  bodyHtml: string;
  durationMinutes: number | null;
  contentType: 'text' | 'video' | 'audio' | 'pdf' | 'link';
  /** Video: the external YouTube/Vimeo URL. Link: the external resource URL. */
  mediaUrl: string | null;
  /** Audio/PDF: the resolved public file-server URL (server-resolved from mediaKey). */
  mediaSrc: string | null;
}

const TYPE_ICON = {
  text: FileText,
  video: Video,
  audio: Headphones,
  pdf: FileText,
  link: Link2,
} as const;

/** The overview pseudo-entry's id — never collides with a lesson uuid. */
const OVERVIEW = '__overview__';

/**
 * Prose, tightened. Tailwind's defaults are set for a wide-open article page:
 * 1.75 line-height and 1.25em paragraph gaps. Inside a bounded reading pane that
 * reads as drift, so the leading and the block rhythm are pulled in — still
 * comfortable (1.65), just not airy.
 */
const proseClass =
  'prose prose-sm md:prose-base max-w-none text-gray-600 ' +
  'prose-p:leading-[1.65] prose-p:my-3 ' +
  'prose-headings:text-rmc-green-deep prose-headings:mt-5 prose-headings:mb-2 ' +
  'prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-li:leading-[1.6] ' +
  'prose-blockquote:my-4 prose-blockquote:border-rmc-gold ' +
  'prose-img:my-4 prose-img:rounded-xl ' +
  'prose-strong:text-gray-900 prose-a:text-rmc-green';

/**
 * The course player: navigation on the left, the selected entry on the right.
 * The course description is the first entry ("About this course"), so the page
 * is one two-column region instead of a description section stacked above a
 * separate outline.
 *
 * One entry at a time — an accordion stacked every lesson into a single scroll,
 * which a long transcript (tens of thousands of characters, with inline images)
 * turns into an unusable page. Only the active entry is mounted, so a video or
 * audio element never buffers for a lesson the reader isn't looking at.
 */
export function CourseLessonBrowser({
  lessons,
  overviewHtml = '',
  courseSlug,
}: {
  lessons: OutlineLesson[];
  /** Sanitised course description. Omitted/empty → no overview entry. */
  overviewHtml?: string;
  /** The course slug — needed to read and write the member's progress. */
  courseSlug: string;
}) {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const hasOverview = Boolean(overviewHtml.trim());
  const ids = [...(hasOverview ? [OVERVIEW] : []), ...lessons.map((l) => l.id)];
  const [activeId, setActiveId] = useState(ids[0] ?? '');
  const paneRef = useRef<HTMLDivElement>(null);

  // ── Progress ───────────────────────────────────────────────────────────────
  // The set of completed lesson ids, mirrored from the server. A lesson auto-
  // completes the moment it is opened (no manual step), so there is no toggle —
  // only a one-way "ensure complete".
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  // True once the member's existing progress has loaded, so auto-complete does
  // not fire against an empty set and re-POST lessons that are already done.
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Lessons with an auto-complete write in flight — stops a re-render or a
  // re-select from firing a second write for the same lesson.
  const inFlight = useRef<Set<string>>(new Set());

  // The currently open entry — computed here (before the effects) so the auto-
  // complete effect can key on it. ids can be empty; the guards below handle it.
  const index = Math.max(0, ids.indexOf(activeId));
  const currentId = ids[index];
  const isOverview = currentId === OVERVIEW;

  // Load the member's progress once they are known to be signed in. Anonymous
  // visitors never hit the authed endpoint (it would 401). Guarded against a
  // slug/auth change mid-flight so a stale response can't overwrite fresh state.
  useEffect(() => {
    if (!isAuthenticated) {
      setCompleted(new Set());
      setProgressLoaded(false);
      return;
    }
    let cancelled = false;
    setProgressLoaded(false);
    dawahApi.courses
      .progress(courseSlug)
      .then((p) => {
        if (!cancelled) setCompleted(new Set(p.completedLessonIds));
      })
      .catch(() => {
        // A failed progress read must not break the page — the reader just sees
        // no ticks, and opening a lesson will still record it.
        if (!cancelled) setCompleted(new Set());
      })
      .finally(() => {
        if (!cancelled) setProgressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, courseSlug]);

  // Auto-complete the open lesson. Fires when a real lesson is opened (the
  // overview is not a lesson) once progress has loaded and only if it is not
  // already done or being written. Optimistic tick, reconciled with the server;
  // a failed write rolls the tick back so nothing looks done that isn't.
  useEffect(() => {
    if (!isAuthenticated || !progressLoaded) return;
    if (!currentId || currentId === OVERVIEW) return;
    if (completed.has(currentId) || inFlight.current.has(currentId)) return;

    const lessonId = currentId;
    inFlight.current.add(lessonId);
    setSaveError(false);
    setCompleted((prev) => new Set(prev).add(lessonId));
    dawahApi.courses
      .completeLesson(courseSlug, lessonId)
      .then((p) => setCompleted(new Set(p.completedLessonIds)))
      .catch(() => {
        setCompleted((prev) => {
          const next = new Set(prev);
          next.delete(lessonId);
          return next;
        });
        setSaveError(true);
      })
      .finally(() => {
        inFlight.current.delete(lessonId);
      });
  }, [currentId, isAuthenticated, progressLoaded, completed, courseSlug]);

  const totalLessons = lessons.length;
  const doneLessons = lessons.reduce((n, l) => n + (completed.has(l.id) ? 1 : 0), 0);
  const percent = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  if (!ids.length) return null;
  const active = isOverview ? null : lessons.find((l) => l.id === currentId) ?? null;

  const select = (id: string) => {
    setActiveId(id);
    // Switching from the foot of a long transcript would otherwise leave the
    // reader scrolled deep inside the *new* entry's body.
    paneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5">
      {/* ── Progress / sign-in nudge ────────────────────────────────────── */}
      {totalLessons > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
                  {t('courses.progress.heading')}
                </p>
                <p className="text-xs font-semibold text-gray-600">
                  {percent === 100
                    ? t('courses.progress.courseComplete')
                    : t('courses.progress.lessonsDone', {
                        completed: doneLessons,
                        total: totalLessons,
                      })}
                </p>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {saveError && (
                <p className="mt-2 text-xs text-rose-600">{t('courses.progress.error')}</p>
              )}
            </>
          ) : authLoading ? null : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">{t('courses.progress.signInPrompt')}</p>
              <Link
                href={`/${locale}/login?redirect=${encodeURIComponent(
                  `/${locale}/dawah/courses/${courseSlug}`,
                )}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rmc-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rmc-green-dark"
              >
                {t('courses.progress.signIn')}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* ── Left: navigation ────────────────────────────────────────────── */}
      {/* Pinned beside the lesson while the lesson scrolls with the page.
          Bounded to the viewport so a long outline scrolls inside itself rather
          than running off the bottom of the screen. Sticky works because no
          ancestor up to the page sets a transform (the browser is intentionally
          not wrapped in <Reveal>). */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        {/* Mobile: a plain select — a 20-lesson list above the content would
            push the lesson itself off the screen on a phone. */}
        <label className="block lg:hidden">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
            {t('courses.outline')}
          </span>
          <select
            value={currentId}
            onChange={(e) => select(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green"
          >
            {hasOverview && <option value={OVERVIEW}>{t('courses.aboutCourse')}</option>}
            {lessons.map((l, i) => (
              <option key={l.id} value={l.id}>
                {completed.has(l.id) ? '✓ ' : ''}{i + 1}. {l.title}
              </option>
            ))}
          </select>
        </label>

        {/* Desktop: the sticky list */}
        <nav aria-label={t('courses.outline')} className="hidden lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
            {t('courses.outline')}
          </p>
          <ol className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
            {hasOverview && (
              <li>
                <button
                  type="button"
                  onClick={() => select(OVERVIEW)}
                  aria-current={isOverview ? 'true' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                    isOverview ? 'bg-rmc-green-light' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                      isOverview ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className={`text-[13px] font-semibold ${isOverview ? 'text-rmc-green-deep' : 'text-gray-700'}`}>
                    {t('courses.aboutCourse')}
                  </span>
                </button>
              </li>
            )}
            {lessons.map((l, i) => {
              const isActive = l.id === currentId;
              const Icon = TYPE_ICON[l.contentType] ?? FileText;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => select(l.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                      isActive ? 'bg-rmc-green-light' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                        completed.has(l.id)
                          ? 'bg-emerald-600 text-white'
                          : isActive
                            ? 'bg-rmc-green text-white'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {completed.has(l.id) ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-semibold leading-snug ${isActive ? 'text-rmc-green-deep' : 'text-gray-700'}`}>
                        {l.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="h-3 w-3" aria-hidden />
                          {t(`courses.contentType.${l.contentType}`)}
                        </span>
                        {l.durationMinutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            {t('courses.duration', { minutes: l.durationMinutes })}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      {/* ── Right: the active entry ─────────────────────────────────────── */}
      {/* Scrolls with the page; scroll-mt keeps a switched-to entry clear of the
          fixed navbar when select() brings it into view. */}
      <div ref={paneRef} className="min-w-0 scroll-mt-24">
        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-5">
          {isOverview ? (
            <>
              {/* h2, not h3: with the section heading gone this is the main
                  content heading under the page's h1. */}
              <h2 className="text-lg font-bold text-rmc-green-deep md:text-xl">
                {t('courses.aboutCourse')}
              </h2>
              <span
                aria-hidden
                className="mt-2 mb-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
              />
              <div className={proseClass} dangerouslySetInnerHTML={{ __html: overviewHtml }} />
            </>
          ) : active ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-gold">
                {lessons.indexOf(active) + 1} / {lessons.length}
              </p>
              <h2 className="mt-1 text-lg font-bold text-rmc-green-deep md:text-xl">{active.title}</h2>
              {active.durationMinutes ? (
                <p className="mt-1 text-xs text-gray-400">
                  {t('courses.duration', { minutes: active.durationMinutes })}
                </p>
              ) : null}
              {active.summary && <p className="mt-3 text-sm text-gray-600">{active.summary}</p>}

              {/* Player — keyed by lesson so switching tears the old one down.
                  Capped rather than full-bleed: at the pane's full width a 16:9
                  frame is ~460px tall and pushes the lesson text off the screen.
                  The cap lives here, not in LessonVideo, so the component stays
                  "fill my container" and each caller picks its own size. */}
              {active.contentType === 'video' && active.mediaUrl && (
                <div className="mt-4 max-w-2xl">
                  <LessonVideo key={active.id} mediaUrl={active.mediaUrl} title={active.title} />
                </div>
              )}
              {active.contentType === 'audio' && active.mediaSrc && (
                <div className="mt-4">
                  <LessonAudio key={active.id} src={active.mediaSrc} title={active.title} />
                </div>
              )}
              {active.contentType === 'pdf' && active.mediaSrc && (
                <div className="mt-4">
                  <LessonResource kind="pdf" href={active.mediaSrc} />
                </div>
              )}
              {active.contentType === 'link' && active.mediaUrl && (
                <div className="mt-4">
                  <LessonResource kind="link" href={active.mediaUrl} sublabel={active.mediaUrl} />
                </div>
              )}

              {active.bodyHtml && (
                <div className={`${proseClass} mt-5`} dangerouslySetInnerHTML={{ __html: active.bodyHtml }} />
              )}

              {/* Lessons auto-complete on open, so there is no button — just a
                  passive confirmation once the write has landed. Signed-in only. */}
              {isAuthenticated && completed.has(active.id) && (
                <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {t('courses.progress.completed')}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Prev / next — the reason a player beats an accordion: a clear path
            through the course without hunting the sidebar. */}
        {ids.length > 1 && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => select(ids[index - 1])}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {t('pagination.previous')}
            </button>
            <button
              type="button"
              disabled={index === ids.length - 1}
              onClick={() => select(ids[index + 1])}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:pointer-events-none disabled:opacity-40"
            >
              {t('pagination.next')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
