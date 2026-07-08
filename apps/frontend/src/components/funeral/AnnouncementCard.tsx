import { MapPin, Clock, Landmark } from 'lucide-react';
import type { FuneralAnnouncement } from './types';

interface Labels {
  age: string;
  janazah: string;
  prayer: string;
  burial: string;
}

/**
 * A dignified janāzah notice card. Presentational (server-safe); the full
 * announcements page adds share/print actions on top of this.
 */
export function AnnouncementCard({
  item,
  labels,
  locale,
  actions,
}: {
  item: FuneralAnnouncement;
  labels: Labels;
  locale: string;
  /** Optional interactive footer (e.g. share/print) supplied by a client wrapper. */
  actions?: React.ReactNode;
}) {
  const prayer = new Date(item.prayerTime);
  const dod = new Date(item.dateOfDeath);
  const initials = item.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const rows: { icon: typeof MapPin; label: string; value: string }[] = [
    {
      icon: Clock,
      label: labels.prayer,
      value: prayer.toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    },
    { icon: Landmark, label: labels.janazah, value: item.janazahLocation },
    { icon: MapPin, label: labels.burial, value: item.burialLocation },
  ];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Header: initials medallion + name */}
      <div className="flex items-center gap-3 border-b border-gray-50 bg-gradient-to-br from-slate-50 to-white p-5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rmc-green-light text-sm font-bold text-rmc-green ring-1 ring-rmc-green/15"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-gray-900">{item.name}</h3>
          <p className="text-[12px] text-gray-500">
            {labels.age} {item.age} · {dod.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 space-y-2.5 p-5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-2.5">
            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
            <p className="text-[13px] text-gray-600">
              <span className="text-gray-400">{r.label}:</span>{' '}
              <span className="font-medium text-gray-800">{r.value}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Verse */}
      {item.verse && (
        <p
          className="border-t border-gray-50 bg-rmc-green-light/30 px-5 py-3 text-center font-arabic text-lg leading-relaxed text-rmc-green-dark"
          dir="rtl"
          lang="ar"
        >
          {item.verse}
        </p>
      )}

      {/* Interactive footer (share / print) */}
      {actions && (
        <div className="flex items-center justify-end gap-1.5 border-t border-gray-50 px-4 py-2.5">
          {actions}
        </div>
      )}
    </article>
  );
}
