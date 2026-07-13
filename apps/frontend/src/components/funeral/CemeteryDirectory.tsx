'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Search, MapPin } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import type { Cemetery } from './types';
import { CemeteryCard } from './CemeteryCard';
import { EmptyState } from './EmptyState';

// Leaflet touches window — load the map only on the client.
const CemeteryMap = dynamic(() => import('./CemeteryMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

export function CemeteryDirectory({ locale }: { locale: string }) {
  const t = useTranslations('services.funeral.cemeteryPage');
  const [query, setQuery] = useState('');
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const nonce = useRef(0);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    funeralApi.listCemeteries()
      .then((res) => { if (active) setCemeteries(res); })
      .catch(() => { if (active) setCemeteries([]); });
    return () => { active = false; };
  }, []);

  const labels = {
    capacity: t('capacity'),
    contact: t('contact'),
    directions: t('directions'),
    locate: t('locate'),
    occupancy: t('occupancy'),
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cemeteries;
    return cemeteries.filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }, [query, cemeteries]);

  const locate = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) return;
    setFocus({ lat, lng, nonce: nonce.current++ });
    // On mobile the map sits below the list — bring it into view.
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* List */}
      <div className="space-y-4 lg:col-span-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3 rtl:pr-9"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={MapPin} title={t('emptyTitle')} message={t('emptyText')} />
        ) : (
          <>
            <p className="text-[13px] text-gray-400">{t('resultsCount', { count: filtered.length })}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filtered.map((c) => (
                <CemeteryCard
                  key={c.id}
                  cemetery={c}
                  labels={labels}
                  locale={locale}
                  active={focus != null && c.lat === focus.lat && c.lng === focus.lng}
                  onLocate={c.lat != null && c.lng != null ? () => locate(c.lat, c.lng) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <aside className="lg:col-span-2">
        <div
          ref={mapRef}
          className="h-[22rem] overflow-hidden rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
        >
          <CemeteryMap cemeteries={cemeteries} focus={focus} directionsLabel={t('directions')} />
        </div>
      </aside>
    </div>
  );
}
