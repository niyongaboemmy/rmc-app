'use client';

import { useEffect, useState } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Clock, MapPin, Sunrise, SunMedium, Sun, CloudSun, Sunset, MoonStar } from 'lucide-react';

/* Kigali, Rwanda — default when geolocation is unavailable */
const KIGALI = { lat: -1.9403, lng: 29.8739, tz: 'Africa/Kigali' };
const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const LABELS: Record<string, string> = {
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fajr: Sunrise, sunrise: SunMedium, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: MoonStar,
};

/* Real prayer times computed in the browser (Muslim World League, matches the backend) */
function computeTimes(lat: number, lng: number, tz?: string): Record<string, string> {
  const pt = new PrayerTimes(new Coordinates(lat, lng), new Date(), CalculationMethod.MuslimWorldLeague());
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, ...(tz ? { timeZone: tz } : {}),
    }).format(d);
  return {
    fajr: fmt(pt.fajr), sunrise: fmt(pt.sunrise), dhuhr: fmt(pt.dhuhr),
    asr: fmt(pt.asr), maghrib: fmt(pt.maghrib), isha: fmt(pt.isha),
  };
}

function getNextPrayer(times: Record<string, string>, now: Date): string {
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (const name of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    if (times[name] > current) return name;
  }
  return 'fajr';
}

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

export function PrayerColumn() {
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [usingLocation, setUsingLocation] = useState(false);
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUsingLocation(true); setTimes(computeTimes(pos.coords.latitude, pos.coords.longitude)); },
        () => setTimes(computeTimes(KIGALI.lat, KIGALI.lng, KIGALI.tz)),
        { timeout: 5000 },
      );
    } else {
      setTimes(computeTimes(KIGALI.lat, KIGALI.lng, KIGALI.tz));
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const next = times ? getNextPrayer(times, now) : '';
  const remaining = times && next ? minutesUntil(times[next], now) : 0;
  const location = usingLocation ? 'Your location' : 'Kigali, Rwanda';

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-rmc-green-dark to-rmc-green-deep ring-1 ring-rmc-gold/25 shadow-2xl shadow-black/50">
      {/* Gold top accent — distinguishes this panel from the cinematic carousel */}
      <div className="h-1 bg-gradient-to-r from-transparent via-rmc-gold to-transparent" />
      {/* Subtle Islamic geometry */}
      <div aria-hidden className="absolute inset-0 pattern-islamic opacity-[0.06] pointer-events-none" />

      <div className="relative p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/10">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-rmc-gold/15 border border-rmc-gold/30 text-rmc-gold shrink-0">
            <Clock className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white leading-none">Prayer Times</h3>
            <p className="text-xs text-white/55 mt-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rmc-gold-light shrink-0" />
              <span className="truncate">{dateLabel ? `${dateLabel} · ${location}` : location}</span>
            </p>
          </div>
        </div>

        {/* Next prayer + live countdown — the highlight */}
        {times && next && (
          <div className="rounded-2xl bg-rmc-gold/10 border border-rmc-gold/25 px-4 py-3.5 mb-5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-rmc-gold-light font-bold">Next Prayer</p>
              <p className="text-rmc-gold-light font-bold text-sm tabular-nums">in {formatRemaining(remaining)}</p>
            </div>
            <p className="text-white font-bold text-2xl leading-none">
              {LABELS[next]}
              <span className="text-white/60 font-semibold text-xl tabular-nums"> · {times[next]}</span>
            </p>
          </div>
        )}

        {/* Full timetable */}
        {!times ? (
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {ORDER.map((name) => {
              const isNext = name === next;
              const PrayerIcon = ICONS[name];
              return (
                <li
                  key={name}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                    isNext ? 'bg-rmc-gold/15 ring-1 ring-rmc-gold/30' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <PrayerIcon className={`w-4 h-4 shrink-0 ${isNext ? 'text-rmc-gold-light' : 'text-rmc-gold-light/45'}`} />
                    <span className={`text-base ${isNext ? 'text-rmc-gold-light font-bold' : 'text-white/85'}`}>
                      {LABELS[name]}
                    </span>
                  </span>
                  <span className={`text-base tabular-nums font-semibold ${isNext ? 'text-white' : 'text-white/75'}`}>
                    {times[name]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
