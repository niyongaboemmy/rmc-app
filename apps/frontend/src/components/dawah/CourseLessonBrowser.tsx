'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, ArrowRight, Clock, FileText, Headphones, Info, Link2, PlayCircle, Video,
} from 'lucide-react';
import { LessonVideo } from './LessonVideo';
import { LessonAudio } from './LessonAudio';
import { LessonResource } from './LessonResource';

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
  isPreview: boolean;
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
}: {
  lessons: OutlineLesson[];
  /** Sanitised course description. Omitted/empty → no overview entry. */
  overviewHtml?: string;
}) {
  const t = useTranslations('dawah');
  const hasOverview = Boolean(overviewHtml.trim());
  const ids = [...(hasOverview ? [OVERVIEW] : []), ...lessons.map((l) => l.id)];
  const [activeId, setActiveId] = useState(ids[0] ?? '');
  const paneRef = useRef<HTMLDivElement>(null);

  if (!ids.length) return null;

  const index = Math.max(0, ids.indexOf(activeId));
  const currentId = ids[index];
  const isOverview = currentId === OVERVIEW;
  const active = isOverview ? null : lessons.find((l) => l.id === currentId) ?? null;

  const select = (id: string) => {
    setActiveId(id);
    // Switching from the foot of a long transcript would otherwise leave the
    // reader scrolled deep inside the *new* entry's body.
    paneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
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
              <option key={l.id} value={l.id}>{i + 1}. {l.title}</option>
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
                        isActive ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i + 1}
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
                        {l.isPreview && (
                          <span className="inline-flex items-center gap-1 font-semibold text-rmc-green">
                            <PlayCircle className="h-3 w-3" aria-hidden />
                            {t('courses.freePreview')}
                          </span>
                        )}
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
  );
}
