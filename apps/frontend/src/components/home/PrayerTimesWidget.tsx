'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, MapPin } from 'lucide-react';
import { publicApi } from '@/lib/public-api';
import { useScrollReveal } from '@/hooks/useScrollReveal';

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

function getNextPrayer(times: Record<string, string>): string {
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const name of order) {
    if (times[name] > current) return name;
  }
  return 'fajr';
}

const prayerIcons: Record<string, React.FC<{ className?: string; isActive: boolean }>> = {
  fajr: FajrIcon,
  sunrise: SunriseIcon,
  dhuhr: DhuhrIcon,
  asr: AsrIcon,
  maghrib: MaghribIcon,
  isha: IshaIcon,
};

export function PrayerTimesWidget() {
  const t = useTranslations('home.prayerTimes');
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string>('');
  const [usingLocation, setUsingLocation] = useState(false);
  const { ref, visible } = useScrollReveal(0.1);

  useEffect(() => {
    const fetchTimes = (lat?: number, lng?: number) => {
      publicApi.getPrayerTimes(lat, lng).then((data) => {
        setTimes(data as Record<string, string>);
        setNextPrayer(getNextPrayer(data as Record<string, string>));
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUsingLocation(true); fetchTimes(pos.coords.latitude, pos.coords.longitude); },
        () => fetchTimes(),
        { timeout: 5000 },
      );
    } else {
      fetchTimes();
    }
  }, []);

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
    <section className="relative bg-white py-16 px-4 pattern-light overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-10 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Clock className="w-4 h-4" />
            {t('title')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('title')}</h2>
          <p className="text-gray-400 mt-2 flex items-center justify-center gap-1.5 text-sm">
            {usingLocation && <MapPin className="w-3.5 h-3.5" />}
            {usingLocation ? t('usingLocation') : t('subtitle')}
          </p>
        </div>

        {!times ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
            {prayers.map((p, i) => {
              const isNext = p.name === nextPrayer;
              return (
                <div
                  key={p.name}
                  className={`relative rounded-2xl p-4 text-center transition-all duration-500 cursor-default group ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  } ${
                    isNext
                      ? 'bg-rmc-green text-white shadow-xl shadow-rmc-green/30 scale-105 animate-pulse-glow'
                      : 'bg-gray-50 text-gray-700 border border-gray-100 hover:border-rmc-green/30 hover:bg-rmc-green-light hover:scale-105 hover:shadow-md'
                  }`}
                  style={{ transitionDelay: `${i * 60 + 200}ms` }}
                >
                  {isNext && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-rmc-gold text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow whitespace-nowrap">
                      {t('next')}
                    </span>
                  )}
                  <div className={`w-9 h-9 mx-auto mb-2 transition-transform duration-300 ${isNext ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <p.Icon className="w-full h-full" isActive={isNext} />
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isNext ? 'text-white/70' : 'text-gray-400'}`}>
                    {t(p.name as keyof typeof t)}
                  </div>
                  <div className={`text-lg md:text-xl font-bold tracking-tight ${isNext ? 'text-white' : 'text-gray-900'}`}>
                    {p.time}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
