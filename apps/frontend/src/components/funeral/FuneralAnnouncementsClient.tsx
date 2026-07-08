'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Landmark, MapPin, CalendarDays } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import type { FuneralAnnouncement } from './types';
import { AnnouncementCard } from './AnnouncementCard';
import { AnnouncementActions } from './AnnouncementActions';
import { AnnouncementSkeleton } from './AnnouncementSkeleton';
import { EmptyState } from './EmptyState';

type TimeFilter = 'all' | 'today' | 'week';

const selectClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30';

export function FuneralAnnouncementsClient({ locale }: { locale: string }) {
  const t = useTranslations('services.funeral');

  const [items, setItems] = useState<FuneralAnnouncement[] | null>(null);
  const [query, setQuery] = useState('');
  const [time, setTime] = useState<TimeFilter>('all');
  const [mosque, setMosque] = useState('');
  const [cemetery, setCemetery] = useState('');

  // Client-side load avoids SSR/hydration mismatch on the relative dates.
  useEffect(() => {
    let active = true;
    funeralApi.listAnnouncements().then((res) => { if (active) setItems(res); });
    return () => { active = false; };
  }, []);

  const annLabels = {
    age: t('landing.annLabels.age'),
    janazah: t('landing.annLabels.janazah'),
    prayer: t('landing.annLabels.prayer'),
    burial: t('landing.annLabels.burial'),
  };
  const actionLabels = {
    ...annLabels,
    share: t('announcementsPage.share'),
    print: t('announcementsPage.print'),
    shareCopied: t('announcementsPage.shareCopied'),
  };

  const mosques = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.janazahLocation))).sort(),
    [items],
  );
  const cemeteries = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.burialLocation))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const now = new Date();
    const q = query.trim().toLowerCase();

    // Current week, Monday–Sunday.
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q)) return false;
      if (mosque && i.janazahLocation !== mosque) return false;
      if (cemetery && i.burialLocation !== cemetery) return false;
      if (time !== 'all') {
        const p = new Date(i.prayerTime);
        if (time === 'today') {
          if (p.toDateString() !== now.toDateString()) return false;
        } else if (time === 'week') {
          if (p < monday || p > sunday) return false;
        }
      }
      return true;
    });
  }, [items, query, time, mosque, cemetery]);

  const hasFilters = !!query || time !== 'all' || !!mosque || !!cemetery;
  const clear = () => { setQuery(''); setTime('all'); setMosque(''); setCemetery(''); };

  const timeOptions: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: t('announcementsPage.all') },
    { key: 'today', label: t('announcementsPage.today') },
    { key: 'week', label: t('announcementsPage.thisWeek') },
  ];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Search */}
          <div className="relative lg:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('announcementsPage.searchPlaceholder')}
              aria-label={t('announcementsPage.searchPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3 rtl:pr-9"
            />
          </div>

          {/* Mosque */}
          <div className="relative lg:col-span-3">
            <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
            <select value={mosque} onChange={(e) => setMosque(e.target.value)} aria-label={t('announcementsPage.mosque')} className={`${selectClass} pl-9 rtl:pl-3 rtl:pr-9`}>
              <option value="">{t('announcementsPage.allMosques')}</option>
              {mosques.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Cemetery */}
          <div className="relative lg:col-span-4">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
            <select value={cemetery} onChange={(e) => setCemetery(e.target.value)} aria-label={t('announcementsPage.cemetery')} className={`${selectClass} pl-9 rtl:pl-3 rtl:pr-9`}>
              <option value="">{t('announcementsPage.allCemeteries')}</option>
              {cemeteries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Time segmented + clear */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label={t('announcementsPage.time')}>
            {timeOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setTime(o.key)}
                aria-pressed={time === o.key}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  time === o.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="ms-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-rmc-green"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> {t('announcementsPage.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {items === null ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <AnnouncementSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('announcementsPage.emptyTitle')} message={t('announcementsPage.emptyText')} />
      ) : (
        <>
          <p className="text-[13px] text-gray-400">{t('announcementsPage.resultsCount', { count: filtered.length })}</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                labels={annLabels}
                locale={locale}
                actions={<AnnouncementActions item={item} labels={actionLabels} locale={locale} />}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
