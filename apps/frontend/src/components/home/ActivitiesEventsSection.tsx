'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Newspaper,
  Bell,
  BellRing,
  Images,
} from 'lucide-react';
import {
  MONTHS,
  badgeClass,
  countdownLabel,
  formatLong,
  parseISO,
  type Activity,
} from '@/components/activities/data';
import { GalleryModal } from '@/components/activities/GalleryModal';
import {
  ContentKeys,
  ACTIVITIES_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  isRtl,
  type ActivitiesContent,
} from '@/lib/content-api';

export function ActivitiesEventsSection() {
  const { locale } = useParams<{ locale: string }>();
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';

  // Content managed from Admin → Content → Activities & Events. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<ActivitiesContent>(ACTIVITIES_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<ActivitiesContent>(ContentKeys.activities)
      .then((data) => {
        if (active && data) setContent(mergeContent(ACTIVITIES_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const activities = content.activities;
  const events = content.events;

  const [featured, ...rest] = events;
  const fDate = featured ? parseISO(featured.date) : null;

  // The GalleryModal renders plain strings, so resolve the active activity's
  // Tri fields to the current locale into the Activity shape it expects.
  const activeActivity: Activity | null =
    openIndex !== null && activities[openIndex]
      ? {
          id: `a${openIndex}`,
          category: pick(activities[openIndex].category, locale),
          tone: activities[openIndex].tone,
          title: pick(activities[openIndex].title, locale),
          excerpt: pick(activities[openIndex].excerpt, locale),
          date: activities[openIndex].date,
          image: activities[openIndex].image,
          gallery: activities[openIndex].gallery,
          peopleHelped: activities[openIndex].peopleHelped,
          budgetUsed: activities[openIndex].budgetUsed,
        }
      : null;

  const openGallery = (i: number) => {
    setImgIndex(0);
    setOpenIndex(i);
  };

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      {/* Faint geometric texture + single gold hairline at the top */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-14 animate-fade-up">
          <div className="inline-flex items-center gap-2.5 mb-5 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
            <span className={arFont} dir={rtl ? 'rtl' : 'ltr'}>
              {pick(content.eyebrow, locale)}
            </span>
          </div>

          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {pick(content.title, locale)}
          </h2>

          {/* Gold ornament flourish with a small Arabic touch */}
          <div className="ornament-divider max-w-xs mx-auto mt-4 mb-4">
            <p className="font-arabic text-rmc-green-dark text-base md:text-lg leading-loose px-2" dir="rtl">
              بِسْمِ اللَّهِ
            </p>
          </div>

          <p
            className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {pick(content.lede, locale)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* ════════ LATEST ACTIVITIES — left, wider (3 cols) ════════ */}
          <div className="lg:col-span-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center ring-1 ring-rmc-green/10">
                  <Newspaper className="w-4 h-4 text-rmc-green" />
                </span>
                <div>
                  <h3
                    className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                    dir={rtl ? 'rtl' : 'ltr'}
                  >
                    {pick(content.activitiesHeading, locale)}
                  </h3>
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
            <div className="rounded-2xl border border-gray-100 ring-1 ring-black/5 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
              {activities.map((activity, i) => {
                const title = pick(activity.title, locale);
                const excerpt = pick(activity.excerpt, locale);
                const category = pick(activity.category, locale);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openGallery(i)}
                    aria-label={`Open photo gallery: ${title}`}
                    className="group w-full text-left flex gap-4 p-4 sm:p-5 hover:bg-rmc-green-light/30 outline-none focus-visible:bg-rmc-green-light/40 transition-colors duration-300 animate-fade-up"
                    style={{ animationDelay: `${i * 90 + 220}ms` }}
                  >
                    {/* Thumbnail with gallery affordance */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activity.image}
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
              })}
            </div>
          </div>

          {/* ════════ UPCOMING EVENTS — right (2 cols) ════════ */}
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '220ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-gold/10 flex items-center justify-center ring-1 ring-rmc-gold/20">
                  <Calendar className="w-4 h-4 text-rmc-gold" />
                </span>
                <div>
                  <h3
                    className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`}
                    dir={rtl ? 'rtl' : 'ltr'}
                  >
                    {pick(content.eventsHeading, locale)}
                  </h3>
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

            {/* Featured — the soonest event, elevated */}
            {featured && fDate && (
              <Link
                href={`/${locale}/activities`}
                className="group relative block rounded-2xl bg-rmc-green-deep text-white p-5 ring-1 ring-white/10 shadow-sm overflow-hidden motion-safe:hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 animate-fade-up"
                style={{ animationDelay: '320ms' }}
              >
                <div className="absolute inset-0 pattern-islamic opacity-10 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent pointer-events-none" />

                <div className="relative flex items-start gap-4">
                  {/* Gold day-tile on green-deep */}
                  <div className="w-16 shrink-0 text-center rounded-xl bg-white/10 ring-1 ring-white/15 py-2.5 backdrop-blur-sm">
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
                  </div>
                </div>
              </Link>
            )}

            {/* Remaining events */}
            <div className="mt-3 space-y-3">
              {rest.map((event, i) => {
                const d = parseISO(event.date);
                return (
                  <Link
                    key={i}
                    href={`/${locale}/activities`}
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-gray-100 ring-1 ring-black/5 bg-white shadow-sm hover:border-rmc-green/30 hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${i * 80 + 380}ms` }}
                  >
                    {/* Date tile — gold day on green-deep, flips to solid green on hover */}
                    <div className="w-12 shrink-0 text-center rounded-xl bg-rmc-green-deep py-2 group-hover:bg-rmc-green transition-colors duration-300">
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
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Subscribe CTA — matches the home-page system */}
            <div
              className="mt-4 flex items-center gap-4 p-4 rounded-2xl border border-rmc-green/15 bg-rmc-green-light/50 animate-fade-up"
              style={{ animationDelay: '620ms' }}
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center ring-1 ring-rmc-green/15 shadow-sm">
                <Bell className="w-4 h-4 text-rmc-green" />
              </span>
              <div className="flex-1 min-w-0">
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
              <Link
                href={`/${locale}/contact`}
                className="group inline-flex items-center gap-1.5 px-4 py-2 shrink-0 bg-rmc-green text-white text-xs font-bold rounded-full shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 motion-safe:hover:scale-105 transition-all duration-300"
              >
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                {pick({ en: 'Subscribe', rw: 'Iyandikishe', ar: 'اشترك' }, locale)}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

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
