'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Newspaper,
  Bell,
  Images,
} from 'lucide-react';
import { InlineSubscribe } from '@/components/subscribe/InlineSubscribe';
import {
  MONTHS,
  badgeClass,
  countdownLabel,
  formatLong,
  parseISO,
  isUpcoming,
  type Activity,
} from '@/components/activities/data';
import { GalleryModal } from '@/components/activities/GalleryModal';
import {
  ContentKeys,
  ACTIVITIES_DEFAULT,
  pick,
  isRtl,
  type ActivitiesContent,
  type ActivityItem,
  type EventItem,
  type Locale,
} from '@/lib/content-api';
import { assetUrl } from '@/lib/api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { ActivityEventDetailModal } from './ActivityEventDetailModal';
import { EventCampaignProgress } from './EventCampaignProgress';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';

// Activity dates are free-form display strings (e.g. "June 4, 2026"); parse to a
// timestamp for recency sorting, falling back to 0 when unparseable.
function activityDateTs(date: string): number {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function ActivitiesEventsSection() {
  const { locale } = useParams<{ locale: string }>();
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';

  // Content managed from Admin → Content → Activities & Events, and inline in
  // Edit Mode. Falls back to the built-in defaults until something is saved.
  const { content, editing, setField } = useEditableContent<ActivitiesContent>(
    ContentKeys.activities,
    ACTIVITIES_DEFAULT,
  );
  const lang = locale as Locale;

  const { bumpSeed } = useEditMode();

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  // Which card's "details" sheet is open, addressed by stored-array index.
  const [detail, setDetail] = useState<{ kind: 'activity' | 'event'; index: number } | null>(null);

  // The home page surfaces only 3 rows per column — the full lists live on the
  // /activities page ("View all").

  // Upcoming events are derived dynamically from each event's date against
  // today: past events drop off automatically, the remainder is ordered
  // soonest-first, and the very next one is featured. Recomputes whenever the
  // content changes so the section always reflects the current date.
  // Live campaign data, fetched only when at least one event is actually linked
  // to one — most events are plain calendar entries, and the public site should
  // not pay for a donations request it has no use for.
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const needsCampaigns = useMemo(
    () => content.events.some((e) => !!e.campaignSlug),
    [content.events],
  );

  useEffect(() => {
    if (!needsCampaigns) return;
    let active = true;
    donationsApi
      .listCampaigns()
      .then((data) => {
        if (active) setCampaigns(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* leave empty — cards fall back to plain calendar entries */
      });
    return () => {
      active = false;
    };
  }, [needsCampaigns]);

  /** slug → campaign, so a linked event resolves its live totals in O(1). */
  const campaignBySlug = useMemo(
    () => new Map(campaigns.map((c) => [c.slug, c])),
    [campaigns],
  );

  // Each derived entry keeps the event's index in `content.events` so an inline
  // edit can write back to the right item after filtering/sorting.
  const eventEntries = useMemo(
    () => content.events.map((event, eventIndex) => ({ event, eventIndex })),
    [content.events],
  );

  const upcomingEvents = useMemo(
    () =>
      eventEntries
        .filter(({ event }) => isUpcoming(event.date))
        .sort((a, b) => parseISO(a.event.date).dateObj.getTime() - parseISO(b.event.date).dateObj.getTime())
        .slice(0, 3),
    [eventEntries],
  );

  // Completed events (date already passed) are NOT dropped — they roll into the
  // "Latest" column, most-recent-first, so nothing the community did disappears.
  const pastEvents = useMemo(
    () =>
      eventEntries
        .filter(({ event }) => !isUpcoming(event.date))
        .sort((a, b) => parseISO(b.event.date).dateObj.getTime() - parseISO(a.event.date).dateObj.getTime())
        .slice(0, 3),
    [eventEntries],
  );

  const [featuredEntry, ...rest] = upcomingEvents;
  const featured = featuredEntry?.event ?? null;
  const featuredIndex = featuredEntry?.eventIndex ?? -1;
  const fDate = featured ? parseISO(featured.date) : null;
  const featuredCampaign = featured?.campaignSlug
    ? campaignBySlug.get(featured.campaignSlug)
    : undefined;

  // "Latest" = activity news + completed events, merged most-recent-first and
  // capped at 3 rows. Activity rows carry their original index so the gallery
  // modal still opens the right story.
  const latestItems = useMemo(() => {
    const acts = content.activities.map((activity, activityIndex) => ({
      kind: 'activity' as const,
      ts: activityDateTs(activity.date),
      activity,
      activityIndex,
    }));
    const past = pastEvents.map(({ event, eventIndex }) => ({
      kind: 'event' as const,
      ts: parseISO(event.date).dateObj.getTime(),
      event,
      eventIndex,
    }));
    return [...acts, ...past].sort((a, b) => b.ts - a.ts).slice(0, 3);
  }, [content.activities, pastEvents]);

  // The GalleryModal renders plain strings, so resolve the active activity's
  // Tri fields to the current locale into the Activity shape it expects.
  const activeActivity: Activity | null =
    openIndex !== null && content.activities[openIndex]
      ? {
          id: `a${openIndex}`,
          category: pick(content.activities[openIndex].category, locale),
          tone: content.activities[openIndex].tone,
          title: pick(content.activities[openIndex].title, locale),
          excerpt: pick(content.activities[openIndex].excerpt, locale),
          date: content.activities[openIndex].date,
          image: content.activities[openIndex].image,
          gallery: content.activities[openIndex].gallery,
          peopleHelped: content.activities[openIndex].peopleHelped,
          budgetUsed: content.activities[openIndex].budgetUsed,
        }
      : null;

  const openGallery = (i: number) => {
    setImgIndex(0);
    setOpenIndex(i);
  };

  // ── Edit Mode writes ───────────────────────────────────────────────────────
  // Cards are rendered from derived lists, so every mutation addresses the item
  // by its index in the stored array rather than its on-screen position.

  const setActivityTri = (i: number, field: 'title' | 'excerpt' | 'category', v: string) =>
    setField((d) => { d.activities[i][field][lang] = v; });

  const setActivityField = <K extends keyof ActivityItem>(i: number, field: K, value: ActivityItem[K]) =>
    setField((d) => { d.activities[i][field] = value; });

  const setEventTri = (i: number, field: 'title' | 'type', v: string) =>
    setField((d) => { d.events[i][field][lang] = v; });

  const setEventField = <K extends keyof EventItem>(i: number, field: K, value: EventItem[K]) =>
    setField((d) => { d.events[i][field] = value; });

  const deleteActivity = (i: number) => {
    setField((d) => { d.activities.splice(i, 1); });
    setDetail(null);
    bumpSeed(); // re-seed the index-keyed editables onto their new positions
  };

  const deleteEvent = (i: number) => {
    setField((d) => { d.events.splice(i, 1); });
    setDetail(null);
    bumpSeed();
  };

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      {/* Faint geometric texture + single gold hairline at the top */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-14 animate-fade-up">
          {editing ? (
            <InlineText
              as="h2"
              lang={locale}
              value={pick(content.title, locale)}
              onCommit={(v) => setField((d) => { d.title[lang] = v; })}
              className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
              placeholder="Section title"
            />
          ) : (
            <h2
              className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {pick(content.title, locale)}
            </h2>
          )}

          {/* Gold ornament flourish with a small Arabic touch */}
          <div className="ornament-divider max-w-xs mx-auto mt-4 mb-4">
            <p className="font-arabic text-rmc-green-dark text-base md:text-lg leading-loose px-2" dir="rtl">
              بِسْمِ اللَّهِ
            </p>
          </div>

          {editing ? (
            <InlineText
              as="p"
              lang={locale}
              value={pick(content.lede, locale)}
              onCommit={(v) => setField((d) => { d.lede[lang] = v; })}
              className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
              placeholder="Section lede"
            />
          ) : (
            <p
              className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {pick(content.lede, locale)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* ════════ LATEST ACTIVITIES — left, wider (3 cols) ════════ */}
          <div className="lg:col-span-3 flex flex-col animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center ring-1 ring-rmc-green/10">
                  <Newspaper className="w-4 h-4 text-rmc-green" />
                </span>
                <div>
                  {editing ? (
                    <InlineText
                      as="h3"
                      lang={locale}
                      value={pick(content.activitiesHeading, locale)}
                      onCommit={(v) => setField((d) => { d.activitiesHeading[lang] = v; })}
                      className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                      placeholder="Column heading"
                    />
                  ) : (
                    <h3
                      className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                    >
                      {pick(content.activitiesHeading, locale)}
                    </h3>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Tap a story to view its gallery</p>
                </div>
              </div>
              <Link
                href={`/${locale}/activities`}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors shrink-0"
              >
                {pick({ en: 'View all', rw: 'Reba byose', ar: 'عرض الكل' }, locale)}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* News rows joined by hairlines — each opens an image gallery */}
            <div className="flex-1 rounded-lg border border-gray-200/70 bg-white divide-y divide-gray-100 overflow-hidden">
              {latestItems.map((item, i) => {
                const delay = { animationDelay: `${i * 90 + 220}ms` };

                if (item.kind === 'activity') {
                  const { activity, activityIndex } = item;
                  const title = pick(activity.title, locale);
                  const excerpt = pick(activity.excerpt, locale);
                  const category = pick(activity.category, locale);

                  // Edit Mode: same card, but non-navigating and click-to-edit.
                  if (editing) {
                    return (
                      <div key={`act-edit-${activityIndex}`} className="relative flex gap-4 p-4 sm:p-5">
                        <CardEditToolbar
                          onEdit={() => setDetail({ kind: 'activity', index: activityIndex })}
                          onDelete={() => deleteActivity(activityIndex)}
                        />

                        <InlineImage
                          value={activity.image}
                          onChange={(key) => setActivityField(activityIndex, 'image', key)}
                          folder="activities"
                          alt={title}
                          className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl"
                          imgClassName="object-cover"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`${badgeClass(activity.tone)} ${arFont}`}>
                              <InlineText
                                lang={locale}
                                value={category}
                                onCommit={(v) => setActivityTri(activityIndex, 'category', v)}
                                dir={rtl ? 'rtl' : 'ltr'}
                                placeholder="Category"
                              />
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {activity.date || '—'}
                            </span>
                          </div>
                          <InlineText
                            as="h4"
                            lang={locale}
                            value={title}
                            onCommit={(v) => setActivityTri(activityIndex, 'title', v)}
                            className={`text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 ${arFont}`}
                            dir={rtl ? 'rtl' : 'ltr'}
                            placeholder="Activity title"
                          />
                          <InlineText
                            as="p"
                            lang={locale}
                            value={excerpt}
                            onCommit={(v) => setActivityTri(activityIndex, 'excerpt', v)}
                            className={`text-xs sm:text-[13px] text-gray-500 leading-relaxed ${arFont}`}
                            dir={rtl ? 'rtl' : 'ltr'}
                            placeholder="Short excerpt"
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={`act-${activityIndex}`}
                      type="button"
                      onClick={() => openGallery(activityIndex)}
                      aria-label={`Open photo gallery: ${title}`}
                      className="group w-full text-left flex gap-4 p-4 sm:p-5 hover:bg-rmc-green-light/30 outline-none focus-visible:bg-rmc-green-light/40 transition-colors duration-300 animate-fade-up"
                      style={delay}
                    >
                      {/* Thumbnail with gallery affordance */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetUrl(activity.image)}
                          alt={title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                        />
                        {/* Hover overlay — signals it opens a gallery */}
                        <div className="absolute inset-0 flex items-center justify-center bg-rmc-green-deep/0 group-hover:bg-rmc-green-deep/35 transition-colors duration-300">
                          <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                            <Images className="w-3.5 h-3.5 text-rmc-green" />
                          </span>
                        </div>
                        {/* Photo count badge */}
                        <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] font-bold backdrop-blur-sm">
                          <Images className="w-2.5 h-2.5" />
                          {activity.gallery.length}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`${badgeClass(activity.tone)} ${arFont}`}>{category}</span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {activity.date}
                          </span>
                        </div>
                        <h4
                          className={`text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-rmc-green transition-colors duration-200 ${arFont}`}
                          dir={rtl ? 'rtl' : 'ltr'}
                        >
                          {title}
                        </h4>
                        <p
                          className={`text-xs sm:text-[13px] text-gray-500 leading-relaxed line-clamp-2 ${arFont}`}
                          dir={rtl ? 'rtl' : 'ltr'}
                        >
                          {excerpt}
                        </p>
                      </div>

                      <Images className="hidden sm:block w-4 h-4 text-gray-300 shrink-0 self-center transition-colors duration-300 group-hover:text-rmc-green" />
                    </button>
                  );
                }

                // Completed event row — rolled into Latest once its date passed.
                const { event, eventIndex } = item;
                const d = parseISO(event.date);

                // Edit Mode: same completed-event row, click-to-edit.
                if (editing) {
                  return (
                    <div key={`past-edit-${eventIndex}`} className="relative flex gap-4 p-4 sm:p-5">
                      <CardEditToolbar
                        onEdit={() => setDetail({ kind: 'event', index: eventIndex })}
                        onDelete={() => deleteEvent(eventIndex)}
                      />

                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg bg-gray-100 ring-1 ring-black/5 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 leading-none">
                          {MONTHS[d.m]}
                        </span>
                        <span className="text-2xl font-bold text-gray-500 tabular-nums leading-tight">{d.d}</span>
                        <span className="text-[9px] text-gray-400 leading-none">{d.y}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`${badgeClass(event.tone)} ${arFont}`}>
                            <InlineText
                              lang={locale}
                              value={pick(event.type, locale)}
                              onCommit={(v) => setEventTri(eventIndex, 'type', v)}
                              dir={rtl ? 'rtl' : 'ltr'}
                              placeholder="Type"
                            />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                            {pick({ en: 'Completed', rw: 'Byarangiye', ar: 'منتهية' }, locale)}
                          </span>
                        </div>
                        <InlineText
                          as="h4"
                          lang={locale}
                          value={pick(event.title, locale)}
                          onCommit={(v) => setEventTri(eventIndex, 'title', v)}
                          className={`text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 ${arFont}`}
                          dir={rtl ? 'rtl' : 'ltr'}
                          placeholder="Event title"
                        />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {event.time || '—'}
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{event.location?.split(',')[0] || '—'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={`past-${i}`}
                    href={`/${locale}/activities`}
                    className="group w-full flex gap-4 p-4 sm:p-5 hover:bg-rmc-green-light/30 transition-colors duration-300 animate-fade-up"
                    style={delay}
                  >
                    {/* Muted date tile — this event has already happened */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg bg-gray-100 ring-1 ring-black/5 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 leading-none">
                        {MONTHS[d.m]}
                      </span>
                      <span className="text-2xl font-bold text-gray-500 tabular-nums leading-tight">
                        {d.d}
                      </span>
                      <span className="text-[9px] text-gray-400 leading-none">{d.y}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`${badgeClass(event.tone)} ${arFont}`}>
                          {pick(event.type, locale)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                          {pick({ en: 'Completed', rw: 'Byarangiye', ar: 'منتهية' }, locale)}
                        </span>
                      </div>
                      <h4
                        className={`text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-rmc-green transition-colors duration-200 ${arFont}`}
                        dir={rtl ? 'rtl' : 'ltr'}
                      >
                        {pick(event.title, locale)}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location.split(',')[0]}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ════════ UPCOMING EVENTS — right (2 cols) ════════ */}
          <div className="lg:col-span-2 flex flex-col animate-fade-up" style={{ animationDelay: '220ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-gold/10 flex items-center justify-center ring-1 ring-rmc-gold/20">
                  <Calendar className="w-4 h-4 text-rmc-gold" />
                </span>
                <div>
                  {editing ? (
                    <InlineText
                      as="h3"
                      lang={locale}
                      value={pick(content.eventsHeading, locale)}
                      onCommit={(v) => setField((d) => { d.eventsHeading[lang] = v; })}
                      className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                      placeholder="Column heading"
                    />
                  ) : (
                    <h3
                      className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                    >
                      {pick(content.eventsHeading, locale)}
                    </h3>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Save the date</p>
                </div>
              </div>
              <Link
                href={`/${locale}/activities`}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors shrink-0"
              >
                {pick({ en: 'All events', rw: 'Ibirori byose', ar: 'كل الفعاليات' }, locale)}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Empty state — every event is in the past relative to today */}
            {upcomingEvents.length === 0 && (
              <div className="flex-1 rounded-lg border border-dashed border-gray-200 bg-white/50 p-8 text-center flex flex-col items-center justify-center animate-fade-up">
                <Calendar className="w-8 h-8 text-gray-300 mb-2" aria-hidden="true" />
                <p className={`text-sm font-semibold text-gray-600 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                  {pick({ en: 'No upcoming events', rw: 'Nta birori biteganyijwe', ar: 'لا توجد فعاليات قادمة' }, locale)}
                </p>
                <p className={`text-[11px] text-gray-400 mt-1 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                  {pick({ en: 'Check back soon for new events.', rw: 'Garuka vuba urebe ibindi birori.', ar: 'تحقق قريباً من الفعاليات الجديدة.' }, locale)}
                </p>
              </div>
            )}

            {/* Featured (Edit Mode) — same treatment, click-to-edit */}
            {editing && featured && fDate && (
              <div className="relative block rounded-lg bg-rmc-green-deep text-white p-5 overflow-hidden">
                <div className="absolute inset-0 pattern-islamic opacity-10 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent pointer-events-none" />

                <CardEditToolbar
                  onEdit={() => setDetail({ kind: 'event', index: featuredIndex })}
                  onDelete={() => deleteEvent(featuredIndex)}
                />

                <div className="relative flex items-start gap-4">
                  <div className="w-16 shrink-0 text-center rounded-lg bg-white/10 ring-1 ring-white/15 py-2.5 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 leading-none">
                      {MONTHS[fDate.m]}
                    </p>
                    <p className="text-3xl font-bold leading-tight text-rmc-gold-light tabular-nums">{fDate.d}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rmc-gold-light">
                        <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                        {pick({ en: 'Next up', rw: 'Ibikurikira', ar: 'التالي' }, locale)}
                      </span>
                      <span className="text-[11px] font-semibold text-white/60">{countdownLabel(featured.date)}</span>
                    </div>

                    <InlineText
                      as="h4"
                      lang={locale}
                      value={pick(featured.title, locale)}
                      onCommit={(v) => setEventTri(featuredIndex, 'title', v)}
                      className={`text-[15px] sm:text-base font-bold leading-snug mb-2 ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                      placeholder="Event title"
                    />

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        {formatLong(featured.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        {featured.time || '—'}
                      </span>
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        <span className="truncate">{featured.location?.split(',')[0] || '—'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Featured — the soonest event, elevated.
                Stretched-link card: the whole surface navigates via an overlay
                anchor, so the optional Donate link is a SIBLING rather than a
                nested anchor (invalid HTML, and it breaks hydration). */}
            {!editing && featured && fDate && (
              <div
                className="group relative block rounded-lg bg-rmc-green-deep text-white p-5 overflow-hidden motion-safe:hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 animate-fade-up"
                style={{ animationDelay: '320ms' }}
              >
                <div className="absolute inset-0 pattern-islamic opacity-10 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent pointer-events-none" />

                <Link
                  href={`/${locale}/activities`}
                  aria-label={pick(featured.title, locale)}
                  className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold-light rounded-lg"
                />

                <div className="relative flex items-start gap-4">
                  {/* Gold day-tile on green-deep */}
                  <div className="w-16 shrink-0 text-center rounded-lg bg-white/10 ring-1 ring-white/15 py-2.5 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 leading-none">
                      {MONTHS[fDate.m]}
                    </p>
                    <p className="text-3xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                      {fDate.d}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rmc-gold-light">
                        <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                        {pick({ en: 'Next up', rw: 'Ibikurikira', ar: 'التالي' }, locale)}
                      </span>
                      <span className="text-[11px] font-semibold text-white/60">
                        {countdownLabel(featured.date)}
                      </span>
                    </div>

                    <h4
                      className={`text-[15px] sm:text-base font-bold leading-snug mb-2 line-clamp-2 ${arFont}`}
                      dir={rtl ? 'rtl' : 'ltr'}
                    >
                      {pick(featured.title, locale)}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        {formatLong(featured.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        {featured.time}
                      </span>
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-rmc-gold-light shrink-0" />
                        <span className="truncate">{featured.location.split(',')[0]}</span>
                      </span>
                    </div>

                    {/* Only when this event is tied to a live campaign. `z-20`
                        lifts it above the overlay anchor so it stays clickable. */}
                    {featuredCampaign && (
                      <div className="relative z-20">
                        <EventCampaignProgress campaign={featuredCampaign} locale={locale} dark />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Remaining events */}
            <div className="mt-3 space-y-3 flex-1">
              {rest.map(({ event, eventIndex }, i) => {
                const d = parseISO(event.date);
                const rowCampaign = event.campaignSlug ? campaignBySlug.get(event.campaignSlug) : undefined;

                // Edit Mode: same row, click-to-edit.
                if (editing) {
                  return (
                    <div
                      key={`up-edit-${eventIndex}`}
                      className="relative flex items-start gap-3 p-4 rounded-lg border border-gray-200/70 bg-white"
                    >
                      <CardEditToolbar
                        onEdit={() => setDetail({ kind: 'event', index: eventIndex })}
                        onDelete={() => deleteEvent(eventIndex)}
                      />

                      <div className="w-12 shrink-0 text-center rounded-lg bg-rmc-green-deep py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 leading-none">
                          {MONTHS[d.m]}
                        </p>
                        <p className="text-xl font-bold leading-tight text-rmc-gold-light tabular-nums">{d.d}</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={`${badgeClass(event.tone)} ${arFont}`}>
                          <InlineText
                            lang={locale}
                            value={pick(event.type, locale)}
                            onCommit={(v) => setEventTri(eventIndex, 'type', v)}
                            dir={rtl ? 'rtl' : 'ltr'}
                            placeholder="Type"
                          />
                        </span>
                        <InlineText
                          as="h4"
                          lang={locale}
                          value={pick(event.title, locale)}
                          onCommit={(v) => setEventTri(eventIndex, 'title', v)}
                          className={`mt-1.5 text-sm font-bold text-gray-900 leading-snug ${arFont}`}
                          dir={rtl ? 'rtl' : 'ltr'}
                          placeholder="Event title"
                        />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {event.time || '—'}
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{event.location?.split(',')[0] || '—'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="group relative flex items-start gap-3 p-4 rounded-lg border border-gray-200/70 bg-white hover:border-rmc-green/30 hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${i * 80 + 380}ms` }}
                  >
                    {/* Stretched link — keeps the optional Donate link a sibling
                        rather than a nested <a>. */}
                    <Link
                      href={`/${locale}/activities`}
                      aria-label={pick(event.title, locale)}
                      className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-rmc-green"
                    />

                    {/* Date tile — gold day on green-deep, flips to solid green on hover */}
                    <div className="w-12 shrink-0 text-center rounded-lg bg-rmc-green-deep py-2 group-hover:bg-rmc-green transition-colors duration-300">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 leading-none">
                        {MONTHS[d.m]}
                      </p>
                      <p className="text-xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                        {d.d}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`${badgeClass(event.tone)} ${arFont}`}>
                        {pick(event.type, locale)}
                      </span>
                      <h4
                        className={`mt-1.5 text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-rmc-green transition-colors duration-200 ${arFont}`}
                        dir={rtl ? 'rtl' : 'ltr'}
                      >
                        {pick(event.title, locale)}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location.split(',')[0]}</span>
                        </span>
                      </div>

                      {/* Only when this event is tied to a live campaign. `z-20`
                          lifts it above the overlay anchor so it stays clickable. */}
                      {rowCampaign && (
                        <div className="relative z-20">
                          <EventCampaignProgress campaign={rowCampaign} locale={locale} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscribe CTA — matches the home-page system */}
            <div
              className="mt-4 p-4 rounded-lg border border-rmc-green/15 bg-rmc-green-light/50 animate-fade-up"
              style={{ animationDelay: '620ms' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center ring-1 ring-rmc-green/15 shadow-sm">
                  <Bell className="w-4 h-4 text-rmc-green" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {pick({ en: 'Never miss an event', rw: 'Ntuzigere usiba igikorwa', ar: 'لا تفوّت أي فعالية' }, locale)}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                    {pick(
                      {
                        en: 'Get notified about upcoming RMC events near you.',
                        rw: 'Menyeshwa ibikorwa bya RMC bigiye kuba hafi yawe.',
                        ar: 'احصل على إشعارات بفعاليات المجتمع الإسلامي الرواندي القادمة بالقرب منك.',
                      },
                      locale,
                    )}
                  </p>
                </div>
              </div>
              <InlineSubscribe source="events-home" className="mt-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode: the fields that don't edit well inline (dates, tone, amounts,
          an activity's gallery) — opened from a card's pencil. */}
      {editing && detail && (
        <ActivityEventDetailModal
          kind={detail.kind}
          activity={detail.kind === 'activity' ? content.activities[detail.index] : undefined}
          event={detail.kind === 'event' ? content.events[detail.index] : undefined}
          onSetActivity={(field, value) => setActivityField(detail.index, field, value)}
          onSetEvent={(field, value) => setEventField(detail.index, field, value)}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Image gallery lightbox */}
      {activeActivity && (
        <GalleryModal
          activity={activeActivity}
          index={imgIndex}
          locale={locale}
          onIndex={setImgIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
