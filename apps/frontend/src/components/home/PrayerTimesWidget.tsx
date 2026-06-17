'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, MapPin, Building2, ArrowRight } from 'lucide-react';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { useScrollReveal } from '@/hooks/useScrollReveal';

/* Kigali, Rwanda — default location when geolocation is unavailable */
const KIGALI = { lat: -1.9403, lng: 29.8739, tz: 'Africa/Kigali' };

/* Compute real, accurate prayer times for a location (Muslim World League method,
   matching the backend) entirely in the browser so the widget always works. */
function computePrayerTimes(lat: number, lng: number, tz?: string): Record<string, string> {
  const coords = new Coordinates(lat, lng);
  const params = CalculationMethod.MuslimWorldLeague();
  const pt = new PrayerTimes(coords, new Date(), params);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(tz ? { timeZone: tz } : {}),
    }).format(d);
  return {
    fajr: fmt(pt.fajr),
    sunrise: fmt(pt.sunrise),
    dhuhr: fmt(pt.dhuhr),
    asr: fmt(pt.asr),
    maghrib: fmt(pt.maghrib),
    isha: fmt(pt.isha),
  };
}

interface PrayerTime {
  name: string;
  time: string;
  Icon: React.FC<{ className?: string; isActive: boolean }>;
}

/* ---------- SVG prayer icons ---------- */
function FajrIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 6 C11 6 7 10 7 15 C7 20 11 24 16 24 C12 19 12 11 18 8 C17.4 6.7 16.7 6 16 6Z" fill={isActive ? 'white' : '#6366f1'} opacity="0.9" />
      <circle cx="22" cy="8" r="1.5" fill={isActive ? '#fde68a' : '#d4a017'} />
      <circle cx="25" cy="13" r="1" fill={isActive ? '#fde68a' : '#d4a017'} />
      <circle cx="20" cy="5" r="1" fill={isActive ? '#fde68a' : '#d4a017'} />
    </svg>
  );
}

function SunriseIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  const c = isActive ? '#fde68a' : '#f59e0b';
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 18 C13 18 11 15.5 11 13 C11 10.5 13 8 16 8 C19 8 21 10.5 21 13 C21 15.5 19 18 16 18Z" fill={c} opacity="0.9" />
      <path d="M8 22 Q16 16 24 22" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <line x1="16" y1="4" x2="16" y2="6.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22.5" y1="6" x2="21" y2="7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="6" x2="11" y2="7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="13" x2="22.5" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="13" x2="9.5" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DhuhrIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  const c = isActive ? '#fde68a' : '#f59e0b';
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="6" fill={c} />
      <line x1="16" y1="4" x2="16" y2="7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="25" x2="16" y2="28" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="16" x2="7" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="25" y1="16" x2="28" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.8" y1="7.8" x2="9.9" y2="9.9" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22.1" y1="22.1" x2="24.2" y2="24.2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24.2" y1="7.8" x2="22.1" y2="9.9" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.9" y1="22.1" x2="7.8" y2="24.2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AsrIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  const c = isActive ? '#fde68a' : '#fb923c';
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="14" cy="13" r="5.5" fill={c} opacity="0.9" />
      <line x1="14" y1="4" x2="14" y2="6.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20.5" y1="6" x2="18.9" y2="7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22.5" y1="13" x2="20" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      {/* Shadow */}
      <path d="M8 22 L20 18 L24 26 L8 26 Z" fill={isActive ? 'rgba(255,255,255,0.2)' : 'rgba(251,146,60,0.2)'} />
    </svg>
  );
}

function MaghribIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  const c = isActive ? '#fde68a' : '#f97316';
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="19" r="5.5" fill={c} opacity="0.85" />
      <line x1="16" y1="11" x2="16" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22.5" y1="12.5" x2="21" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="12.5" x2="11" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="19" x2="23" y2="19" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="19" x2="9" y2="19" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      {/* Horizon */}
      <line x1="5" y1="25" x2="27" y2="25" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Gradient sky hint */}
      <path d="M5 25 Q16 18 27 25" stroke={c} strokeWidth="0.8" fill="none" opacity="0.3" />
    </svg>
  );
}

function IshaIcon({ className, isActive }: { className?: string; isActive: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 7 C11 7 7 11 7 16 C7 21 11 25 16 25 C12 20 12 12 18 9 C17.4 7.7 16.7 7 16 7Z" fill={isActive ? 'white' : '#818cf8'} opacity="0.9" />
      <circle cx="21" cy="7" r="1.2" fill={isActive ? '#fde68a' : '#d4a017'} />
      <circle cx="25" cy="12" r="0.9" fill={isActive ? '#fde68a' : '#d4a017'} />
      <circle cx="23" cy="17" r="0.7" fill={isActive ? '#fde68a' : '#d4a017'} />
      <circle cx="19" cy="4.5" r="0.7" fill={isActive ? '#fde68a' : '#d4a017'} />
    </svg>
  );
}

function getNextPrayer(times: Record<string, string>, now: Date): string {
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  /* Sunrise is not a salah — skip it when picking the next prayer */
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const name of order) {
    if (times[name] > current) return name;
  }
  return 'fajr';
}

/* Minutes from `now` until a HH:MM target (wraps to tomorrow if already passed) */
function minutesUntil(target: string, now: Date): number {
  const [h, m] = target.split(':').map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  let diff = Math.round((t.getTime() - now.getTime()) / 60000);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function formatRemaining(mins: number): string {
  if (mins <= 0) return 'now';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PrayerTimesWidget() {
  const t = useTranslations('home.prayerTimes');
  const { locale } = useParams<{ locale: string }>();
  const { ref, visible } = useScrollReveal(0.15);
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [usingLocation, setUsingLocation] = useState(false);

  useEffect(() => {
    /* Try the visitor's real location; fall back to Kigali. Either way the
       times are computed locally from accurate astronomical data. */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUsingLocation(true);
          setTimes(computePrayerTimes(pos.coords.latitude, pos.coords.longitude));
        },
        () => setTimes(computePrayerTimes(KIGALI.lat, KIGALI.lng, KIGALI.tz)),
        { timeout: 5000 },
      );
    } else {
      setTimes(computePrayerTimes(KIGALI.lat, KIGALI.lng, KIGALI.tz));
    }
  }, []);

  /* Tick every 30s so the next-prayer highlight + countdown stay live */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const nextPrayer = times ? getNextPrayer(times, now) : '';
  const remaining = times && nextPrayer ? minutesUntil(times[nextPrayer], now) : 0;

  const prayers: PrayerTime[] = times
    ? [
        { name: 'fajr', time: times.fajr, Icon: FajrIcon },
        { name: 'sunrise', time: times.sunrise, Icon: SunriseIcon },
        { name: 'dhuhr', time: times.dhuhr, Icon: DhuhrIcon },
        { name: 'asr', time: times.asr, Icon: AsrIcon },
        { name: 'maghrib', time: times.maghrib, Icon: MaghribIcon },
        { name: 'isha', time: times.isha, Icon: IshaIcon },
      ]
    : [];

  return (
    <section className="relative bg-transparent py-16 md:py-20 pattern-light">
      {/* Single gold hairline accent across the top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none" />

      <div
        ref={ref}
        className={`relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Refined, institutional header */}
        <div className="flex items-center gap-2.5 mb-5">
          <Clock className="w-4 h-4 text-rmc-green shrink-0" />
          <h2 className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-gray-900">
            {t('title')}
          </h2>
          <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-rmc-gold/40 to-transparent ml-1" />
        </div>

        {/* The board */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Slim header line — location · live next prayer · find a mosque */}
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-rmc-gold shrink-0" />
              {usingLocation ? t('usingLocation') : t('subtitle')}
            </p>

            <div className="flex items-center gap-3 sm:gap-4">
              {!times || !nextPrayer ? (
                <span className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-xs md:text-sm text-gray-600">
                  <span className="font-semibold uppercase tracking-[0.12em] text-rmc-green">
                    {t('next')}:
                  </span>{' '}
                  <span className="font-semibold text-gray-900">
                    {t(nextPrayer as keyof typeof t)}
                  </span>
                  <span className="text-gray-400"> · </span>
                  <span className="tabular-nums text-gray-700">{times[nextPrayer]}</span>
                  <span className="text-gray-400"> · </span>
                  <span className="font-semibold tabular-nums text-rmc-green">
                    {formatRemaining(remaining)}
                  </span>
                </p>
              )}
              <span className="hidden sm:block h-4 w-px bg-gray-200" />
              <Link
                href={`/${locale}/contact#find-mosque`}
                className="group inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                Find a Mosque
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Prayer row — hairline dividers; next cell quietly marked */}
          {!times ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y divide-x divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-6 flex flex-col items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
                  <span className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                  <span className="h-4 w-14 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y divide-x divide-gray-100">
              {prayers.map((p, i) => {
                const isNext = p.name === nextPrayer;
                return (
                  <div
                    key={p.name}
                    style={{ transitionDelay: visible ? `${i * 70}ms` : '0ms' }}
                    className={`relative px-5 py-6 flex flex-col items-center text-center gap-2.5 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                      isNext ? 'bg-rmc-green-light/60' : 'bg-white'
                    } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    {/* Single quiet green accent on the next prayer */}
                    {isNext && <span className="absolute inset-x-0 top-0 h-0.5 bg-rmc-green" />}

                    <p.Icon className="w-6 h-6" isActive={false} />

                    <div className="flex items-center gap-1.5">
                      {isNext && <span className="w-1.5 h-1.5 rounded-full bg-rmc-green shrink-0" />}
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          isNext ? 'text-rmc-green-dark' : 'text-gray-400'
                        }`}
                      >
                        {t(p.name as keyof typeof t)}
                      </span>
                    </div>

                    <span
                      className={`text-base md:text-lg font-bold tabular-nums tracking-tight ${
                        isNext ? 'text-rmc-green-dark' : 'text-gray-900'
                      }`}
                    >
                      {p.time}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
