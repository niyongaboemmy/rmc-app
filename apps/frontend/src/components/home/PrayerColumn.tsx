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
    <div className="relative h-full flex flex-col rounded-3xl overflow-hidden border border-gray-200/70 bg-white shadow-[0_1px_2px_rgba(13,61,36,0.04),0_16px_40px_-24px_rgba(13,61,36,0.22)]">
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-rmc-green-light border border-rmc-green/15 text-rmc-green shrink-0">
            <Clock className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 leading-none">Prayer Times</h3>
            <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-rmc-gold shrink-0" />
              <span className="truncate">{dateLabel ? `${dateLabel} · ${location}` : location}</span>
            </p>
          </div>
        </div>

        {/* Next prayer + live countdown — the highlight */}
        {times && next && (
          <div className="rounded-xl bg-rmc-green-light/60 border border-rmc-green/15 px-3.5 py-3 mb-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-rmc-green-dark font-bold">Next Prayer</p>
              <p className="text-rmc-green-dark font-bold text-xs tabular-nums">in {formatRemaining(remaining)}</p>
            </div>
            <p className="text-gray-900 font-bold text-xl leading-none">
              {LABELS[next]}
              <span className="text-gray-400 font-semibold text-base tabular-nums"> · {times[next]}</span>
            </p>
          </div>
        )}

        {/* Full timetable — grows to fill the panel so it matches the updates card height */}
        {!times ? (
          <div className="flex flex-1 flex-col justify-between gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-1 flex-col justify-between gap-0.5">
            {ORDER.map((name) => {
              const isNext = name === next;
              const PrayerIcon = ICONS[name];
              return (
                <li
                  key={name}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isNext ? 'bg-rmc-green-light ring-1 ring-rmc-green/20' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <PrayerIcon className={`w-4 h-4 shrink-0 ${isNext ? 'text-rmc-green' : 'text-rmc-green/40'}`} />
                    <span className={`text-sm ${isNext ? 'text-rmc-green-dark font-bold' : 'text-gray-700'}`}>
                      {LABELS[name]}
                    </span>
                  </span>
                  <span className={`text-sm tabular-nums font-semibold ${isNext ? 'text-gray-900' : 'text-gray-500'}`}>
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
