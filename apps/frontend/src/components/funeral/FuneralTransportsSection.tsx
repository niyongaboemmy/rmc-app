'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Truck, MapPin, Phone, Landmark, Search } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { Transport } from './types';

/**
 * Public directory of funeral transport means, grouped under their mosque,
 * with a search bar and a mosque filter.
 */
export function FuneralTransportsSection() {
  const t = useTranslations('services.funeral.landing.transports');

  const [transports, setTransports] = useState<Transport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [mosqueFilter, setMosqueFilter] = useState('');

  useEffect(() => {
    let active = true;
    funeralApi.listTransports()
      .then((res) => { if (active) setTransports(res); })
      .catch(() => { if (active) setTransports([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  // Distinct mosques present in the data (for the filter dropdown).
  const mosques = useMemo(() => {
    const map = new Map<string, string>();
    for (const tr of transports) if (tr.mosqueId) map.set(tr.mosqueId, tr.mosque || '—');
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transports.filter((tr) => {
      if (mosqueFilter && tr.mosqueId !== mosqueFilter) return false;
      if (q && ![tr.name, tr.location, tr.phone, tr.mosque].some((v) => (v ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [transports, query, mosqueFilter]);

  // Group filtered results by mosque (input is already sorted by mosque then name).
  const groups = useMemo(() => {
    const map = new Map<string, { mosque: string; items: Transport[] }>();
    for (const tr of filtered) {
      const key = tr.mosqueId || tr.mosque || '—';
      if (!map.has(key)) map.set(key, { mosque: tr.mosque || '—', items: [] });
      map.get(key)!.items.push(tr);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Nothing configured yet → hide the whole section (no layout noise).
  if (!loaded || transports.length === 0) return null;

  return (
    <section className="relative bg-transparent pb-14">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Truck className="h-6 w-6 text-rmc-green" aria-hidden="true" /> {t('title')}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{t('sub')}</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-4 rtl:pr-9"
            />
          </div>
          <div className="sm:w-64">
            <SearchableSelect
              value={mosqueFilter}
              onChange={setMosqueFilter}
              options={mosques.map((m) => ({ value: m.id, label: m.name }))}
              noneLabel={t('allMosques')}
              placeholder={t('allMosques')}
              searchPlaceholder={t('searchPlaceholder')}
              size="md"
              zIndex={45}
            />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 py-12 text-center text-sm text-gray-400">
            {t('noResults')}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.mosque}>
                {/* Mosque group header */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rmc-green/10 text-rmc-green">
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-gray-700">{group.mosque}</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                    {group.items.length}
                  </span>
                  <span className="ml-1 h-px flex-1 bg-gray-100" aria-hidden="true" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((tr) => (
                    <TransportCard key={tr.id} transport={tr} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TransportCard({ transport }: { transport: Transport }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10 text-rmc-green">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-bold text-gray-900">{transport.name}</h4>
          <p className="truncate text-[12px] text-gray-400">{transport.mosque}</p>
        </div>
      </div>

      <dl className="space-y-2 text-[13px]">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="text-gray-600">{transport.location}</span>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="font-semibold text-gray-800">{transport.phone}</span>
        </div>
      </dl>
    </article>
  );
}
