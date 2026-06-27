'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Images,
  Bell,
  Users,
  Wallet,
  CheckCircle2,
  HandHeart,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InlineSubscribe } from '@/components/subscribe/InlineSubscribe';
import {
  ACTIVITIES,
  EVENTS,
  MONTHS,
  CURRENCY,
  badgeClass,
  countdownLabel,
  formatLong,
  formatMoney,
  formatNumber,
  fundedPercent,
  parseISO,
} from '@/components/activities/data';
import { ActivitiesHero } from '@/components/activities/ActivitiesHero';
import { GalleryModal } from '@/components/activities/GalleryModal';

/* Consistent, lightweight section header — gold-dot kicker + title. */
function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center animate-fade-up">
      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rmc-green-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
        {kicker}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">{subtitle}</p>}
    </div>
  );
}

/* Slim fundraising progress — one concise line + a thin bar that fills on mount. */
function FundingBar({ raised, goal, dark = false }: { raised: number; goal: number; dark?: boolean }) {
  const pct = fundedPercent(raised, goal);
  const funded = pct >= 100;
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  const track = dark ? 'bg-white/15' : 'bg-gray-100';
  const fill = dark || funded ? 'bg-rmc-gold-light' : 'bg-rmc-green';
  const amount = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-white/50' : 'text-gray-400';
  const pctColor = dark || funded ? (dark ? 'text-rmc-gold-light' : 'text-[#8A6A0F]') : 'text-rmc-green';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className={`font-bold tabular-nums ${amount}`}>
          {CURRENCY} {formatMoney(raised)}
          <span className={`font-medium ${muted}`}> / {formatMoney(goal)}</span>
        </span>
        <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${pctColor}`}>
          {funded && <CheckCircle2 className="h-3 w-3 shrink-0" />}
          {pct}%
        </span>
      </div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${fill}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

export function ActivitiesPageClient() {
  const { locale } = useParams<{ locale: string }>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const [featured, ...rest] = EVENTS;
  const fDate = parseISO(featured.date);

  // The single, most-recent activity spotlighted in its own section
  const latest = ACTIVITIES[0];

  const activeActivity = openId ? ACTIVITIES.find((a) => a.id === openId) ?? null : null;

  const openGallery = (id: string) => {
    setImgIndex(0);
    setOpenId(id);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* HERO */}
        <ActivitiesHero />

        {/* ===================================================================
            SECTION 1 — LATEST ACTIVITY
        =================================================================== */}
        <section className="relative overflow-hidden bg-transparent py-16 md:py-20">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader kicker="Recent" title="Latest Activity" subtitle="Our most recent story — tap to view the full gallery." />

            <button
              type="button"
              onClick={() => openGallery(latest.id)}
              aria-label={`Open photo gallery: ${latest.title}`}
              className="group grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-gray-100 bg-white text-left shadow-sm ring-1 ring-black/5 outline-none transition-all duration-300 animate-fade-up hover:border-rmc-green/30 hover:shadow-lg motion-safe:hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-rmc-green lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden lg:aspect-auto lg:min-h-[360px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latest.gallery[0]}
                  alt={latest.title}
                  className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-rmc-green-deep/0 transition-colors duration-300 group-hover:bg-rmc-green-deep/30">
                  <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                    <Images className="h-5 w-5 text-rmc-green" />
                  </span>
                </div>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold-light" />
                  Latest
                </span>
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  <Images className="h-3 w-3" />
                  {latest.gallery.length} photos
                </span>
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <div className="mb-3 flex items-center gap-2">
                  <span className={badgeClass(latest.tone)}>{latest.category}</span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {latest.date}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-bold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-rmc-green sm:text-2xl">
                  {latest.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 sm:text-[15px]">{latest.excerpt}</p>

                {/* Impact — people helped + budget used */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-rmc-green/15 bg-rmc-green-light/50 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rmc-green-dark">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      People helped
                    </span>
                    <p className="mt-1 text-lg font-bold tabular-nums leading-none text-gray-900">
                      {formatNumber(latest.peopleHelped)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rmc-gold/20 bg-rmc-gold/10 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A6A0F]">
                      <Wallet className="h-3.5 w-3.5 shrink-0" />
                      Budget used
                    </span>
                    <p className="mt-1 text-lg font-bold tabular-nums leading-none text-gray-900">
                      {CURRENCY} {formatMoney(latest.budgetUsed)}
                    </p>
                  </div>
                </div>

                <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-full bg-rmc-green px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 group-hover:bg-rmc-green-dark motion-safe:group-hover:scale-105">
                  <Images className="h-3.5 w-3.5 shrink-0" />
                  View gallery
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2 — UPCOMING EVENTS (separate, tinted band)
        =================================================================== */}
        <section className="relative overflow-hidden border-y border-rmc-green/10 bg-rmc-green-light/25 py-16 md:py-20">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader kicker="Upcoming" title="Upcoming Events" subtitle="Mark your calendar — and support each cause with your Sadaqah." />

            {/* Featured — the soonest event, elevated */}
            <div className="relative overflow-hidden rounded-2xl bg-rmc-green-deep p-6 text-white shadow-md ring-1 ring-white/10 animate-fade-up">
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="w-16 shrink-0 rounded-xl bg-white/10 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-white/70">
                    {MONTHS[fDate.m]}
                  </p>
                  <p className="text-3xl font-bold leading-tight tabular-nums text-rmc-gold-light">{fDate.d}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rmc-gold-light">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
                      Next up
                    </span>
                    <span className="text-[11px] font-semibold text-white/60">{countdownLabel(featured.date)}</span>
                  </div>

                  <h3 className="mb-2 text-lg font-bold leading-snug">{featured.title}</h3>

                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-rmc-gold-light" />
                      {formatLong(featured.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-rmc-gold-light" />
                      {featured.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-rmc-gold-light" />
                      {featured.location}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="sm:max-w-xs sm:flex-1">
                      <FundingBar raised={featured.raisedAmount} goal={featured.goalAmount} dark />
                    </div>
                    <Link
                      href={`/${locale}/donate?cause=${featured.id}`}
                      className="group/donate inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-rmc-gold px-6 py-2.5 text-xs font-bold text-rmc-green-deep transition-all duration-300 hover:bg-rmc-gold-light motion-safe:hover:scale-[1.03]"
                    >
                      <HandHeart className="h-4 w-4 shrink-0" />
                      Donate
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/donate:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Remaining events */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rest.map((event, i) => {
                const d = parseISO(event.date);
                return (
                  <div
                    key={event.id}
                    style={{ animationDelay: `${i * 80 + 120}ms` }}
                    className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 animate-fade-up hover:border-rmc-green/30 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 shrink-0 rounded-xl bg-rmc-green-deep py-2.5 text-center transition-colors duration-300 group-hover:bg-rmc-green">
                        <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-white/70">
                          {MONTHS[d.m]}
                        </p>
                        <p className="text-2xl font-bold leading-tight tabular-nums text-rmc-gold-light">{d.d}</p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className={badgeClass(event.tone)}>{event.type}</span>
                        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900">
                          {event.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3 shrink-0" />
                            {event.time}
                          </span>
                          <span className="flex min-w-0 items-center gap-1 text-[11px] text-gray-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.location.split(',')[0]}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <FundingBar raised={event.raisedAmount} goal={event.goalAmount} />
                      <Link
                        href={`/${locale}/donate?cause=${event.id}`}
                        className="group/donate mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-rmc-green/10 px-4 py-2 text-xs font-bold text-rmc-green transition-all duration-300 hover:bg-rmc-green hover:text-white"
                      >
                        <HandHeart className="h-3.5 w-3.5 shrink-0" />
                        Donate
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/donate:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscribe CTA */}
            <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-rmc-green/15 bg-white/70 p-5 shadow-sm sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light ring-1 ring-rmc-green/15">
                <Bell className="h-4 w-4 text-rmc-green" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight text-gray-900">Never miss an event</p>
                <p className="mt-0.5 text-[12px] leading-snug text-gray-500">
                  Get notified about upcoming RMC events and how you can contribute.
                </p>
              </div>
              <InlineSubscribe source="events-activities" />
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Image gallery lightbox */}
      {activeActivity && (
        <GalleryModal
          activity={activeActivity}
          index={imgIndex}
          locale={locale}
          onIndex={setImgIndex}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
