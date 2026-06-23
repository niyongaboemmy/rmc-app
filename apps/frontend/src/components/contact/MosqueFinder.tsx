'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Navigation, Search, X, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FeatureCollection } from 'geojson';
import { publicApi } from '@/lib/public-api';
import { Avatar } from '@/components/ui/Avatar';
import type { MapMosque, DirectionsTarget } from './MosqueMap';

// Leaflet touches `window`, so the map must only load on the client.
const MosqueMap = dynamic(() => import('./MosqueMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

interface ApiMosque {
  id: string;
  name: string;
  address: string | null;
  imamName: string | null;
  imamPhone: string | null;
  imamPhoto: string | null;
  capacity: number | null;
  fridayPrayerTime: string | null;
  phone: string | null;
  email: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  districtId: string | null;
}
interface Province { id: string; name: string; code: string; }

/* -------------------------------------------------------------------------
 * TEMPORARY PLACEHOLDER DATA — FOR TESTING ONLY.
 * The mosques table is currently empty, so these sample mosques (with real
 * Rwanda coordinates across all five provinces) let us exercise the markers,
 * name search and province-click filtering on the map. They are only used as
 * a fallback when the API returns no mosques.
 * TODO: remove this once real mosque data is seeded in the backend.
 * ----------------------------------------------------------------------- */
const PLACEHOLDER_MOSQUES: MapMosque[] = [
  { id: 'tmp-kig-1', name: 'Nyamirambo Grand Mosque', address: 'Nyamirambo, Kigali', imamName: 'Sheikh Abdul Karim Harelimana', imamPhone: '+250 788 300 101', imamPhoto: 'https://i.pravatar.cc/120?img=12', capacity: 3000, fridayPrayerTime: '12:30', phone: '+250 788 300 100', email: 'info@nyamirambomosque.rw', gpsLat: -1.9806, gpsLng: 30.0469, provinceCode: 'KIG' },
  { id: 'tmp-kig-2', name: 'Kigali Islamic Centre', address: 'Nyarugenge, Kigali', imamName: 'Sheikh Musa Sindayigaya', imamPhone: '+250 788 300 111', imamPhoto: null, capacity: 1500, fridayPrayerTime: '12:30', phone: '+250 788 300 110', email: null, gpsLat: -1.9495, gpsLng: 30.0588, provinceCode: 'KIG' },
  { id: 'tmp-nor-1', name: 'Musanze Central Mosque', address: 'Musanze, Northern Province', imamName: 'Sheikh Yusuf Niyonzima', imamPhone: '+250 788 300 121', imamPhoto: null, capacity: 1200, fridayPrayerTime: '12:45', phone: '+250 788 300 120', email: null, gpsLat: -1.4998, gpsLng: 29.6340, provinceCode: 'NOR' },
  { id: 'tmp-nor-2', name: 'Byumba Friday Mosque', address: 'Gicumbi, Northern Province', imamName: 'Sheikh Idris Habimana', imamPhone: null, imamPhoto: null, capacity: 800, fridayPrayerTime: '12:45', phone: null, email: null, gpsLat: -1.5763, gpsLng: 30.0675, provinceCode: 'NOR' },
  { id: 'tmp-sou-1', name: 'Huye Jamia Mosque', address: 'Huye, Southern Province', imamName: 'Sheikh Ramadhan Munyaneza', imamPhone: '+250 788 300 141', imamPhoto: 'https://i.pravatar.cc/120?img=33', capacity: 2000, fridayPrayerTime: '12:30', phone: '+250 788 300 140', email: 'huye.jamia@rmc.rw', gpsLat: -2.5967, gpsLng: 29.7390, provinceCode: 'SOU' },
  { id: 'tmp-sou-2', name: 'Muhanga Central Mosque', address: 'Muhanga, Southern Province', imamName: 'Sheikh Salim Bizimana', imamPhone: null, imamPhoto: null, capacity: 900, fridayPrayerTime: '12:45', phone: null, email: null, gpsLat: -2.0780, gpsLng: 29.7560, provinceCode: 'SOU' },
  { id: 'tmp-eas-1', name: 'Rwamagana Main Mosque', address: 'Rwamagana, Eastern Province', imamName: 'Sheikh Hamza Nkurunziza', imamPhone: '+250 788 300 161', imamPhoto: null, capacity: 1100, fridayPrayerTime: '12:30', phone: '+250 788 300 160', email: null, gpsLat: -1.9487, gpsLng: 30.4347, provinceCode: 'EAS' },
  { id: 'tmp-eas-2', name: 'Nyagatare Friday Mosque', address: 'Nyagatare, Eastern Province', imamName: 'Sheikh Omar Uwimana', imamPhone: null, imamPhoto: null, capacity: 700, fridayPrayerTime: '12:45', phone: null, email: null, gpsLat: -1.2920, gpsLng: 30.3258, provinceCode: 'EAS' },
  { id: 'tmp-wes-1', name: 'Rubavu Central Mosque', address: 'Rubavu, Western Province', imamName: 'Sheikh Bilal Ntaganda', imamPhone: '+250 788 300 181', imamPhoto: null, capacity: 1300, fridayPrayerTime: '12:30', phone: '+250 788 300 180', email: null, gpsLat: -1.6777, gpsLng: 29.2580, provinceCode: 'WES' },
  { id: 'tmp-wes-2', name: 'Karongi Lakeside Mosque', address: 'Karongi, Western Province', imamName: 'Sheikh Ismail Hakizimana', imamPhone: null, imamPhoto: null, capacity: 600, fridayPrayerTime: '12:45', phone: null, email: null, gpsLat: -2.0000, gpsLng: 29.3833, provinceCode: 'WES' },
];

export function MosqueFinder() {
  const t = useTranslations('contact');

  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [mosques, setMosques] = useState<MapMosque[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [directions, setDirections] = useState<DirectionsTarget | null>(null);
  const nonce = useRef(0);

  // Province boundary polygons (static file in /public).
  useEffect(() => {
    fetch('/geo/rwanda-provinces.geojson')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  // All provinces, districts and mosques — resolve each mosque's province via its district.
  useEffect(() => {
    Promise.all([publicApi.getProvinces(), publicApi.getDistricts(), publicApi.getMosques()])
      .then(([provs, dists, list]: [Province[], Array<{ id: string; provinceId: string }>, ApiMosque[]]) => {
        setProvinces(provs);
        const codeByProvinceId = new Map(provs.map((p) => [p.id, p.code]));
        const provinceCodeByDistrict = new Map(
          dists.map((d) => [d.id, codeByProvinceId.get(d.provinceId) ?? null]),
        );
        const mapped: MapMosque[] = list.map((m) => ({
          id: m.id,
          name: m.name,
          address: m.address,
          imamName: m.imamName,
          imamPhone: m.imamPhone,
          imamPhoto: m.imamPhoto,
          capacity: m.capacity,
          fridayPrayerTime: m.fridayPrayerTime,
          phone: m.phone,
          email: m.email,
          gpsLat: m.gpsLat,
          gpsLng: m.gpsLng,
          provinceCode: m.districtId ? provinceCodeByDistrict.get(m.districtId) ?? null : null,
        }));
        // TEMP: fall back to placeholder mosques while the table is empty (testing only).
        setMosques(mapped.length ? mapped : PLACEHOLDER_MOSQUES);
      })
      .finally(() => setLoading(false));
  }, []);

  const provinceName = useMemo(
    () => provinces.find((p) => p.code === selectedProvince)?.name ?? null,
    [provinces, selectedProvince],
  );

  // Search by name spans every province; otherwise filter to the picked province.
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      mosques.filter((m) => {
        if (q) return m.name.toLowerCase().includes(q);
        if (selectedProvince) return m.provinceCode === selectedProvince;
        return true;
      }),
    [mosques, q, selectedProvince],
  );

  const pickProvince = (code: string | null) => {
    setSelectedProvince(code);
    setQuery('');
    setFocus(null);
  };

  const focusMosque = (m: MapMosque) => {
    if (m.gpsLat != null && m.gpsLng != null) {
      setFocus({ lat: m.gpsLat, lng: m.gpsLng, nonce: nonce.current++ });
    }
  };

  const requestDirections = (m: MapMosque) => {
    if (m.gpsLat != null && m.gpsLng != null) {
      setDirections({ mosque: m, nonce: nonce.current++ });
    }
  };

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-gray-100 sm:block">
      {/* Search + results panel — stacked above the map on mobile, floating overlay on sm+ */}
      <div className="z-[1000] flex max-h-[18rem] flex-col overflow-hidden border-b border-gray-100 bg-white sm:absolute sm:top-3.5 sm:left-3.5 sm:max-h-[calc(100%-1.75rem)] sm:w-72 sm:rounded-2xl sm:border sm:border-black/5 sm:bg-white/90 sm:shadow-lg sm:ring-1 sm:ring-black/5 sm:backdrop-blur-md md:w-80">
        <div className="space-y-2.5 p-3">
          {/* Name search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white/70 placeholder:text-gray-400 focus:ring-2 focus:ring-rmc-green/60 focus:border-transparent outline-none transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('clear')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active filter chip / hint */}
          <div className="flex items-center gap-2 text-xs">
            {selectedProvince ? (
              <button
                type="button"
                onClick={() => pickProvince(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green-light px-2.5 py-1 font-medium text-rmc-green-dark hover:bg-rmc-green/15 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {provinceName}
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-gray-400 leading-snug">{t('mapHint')}</span>
            )}
          </div>
        </div>

        {/* Results (scrolls within the panel) */}
        <div className="overflow-y-auto border-t border-gray-100 px-3 py-2.5">
          {loading ? (
            <div className="space-y-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="space-y-1.5">
              {visible.map((mosque) => {
                const hasGps = mosque.gpsLat != null && mosque.gpsLng != null;
                return (
                  <div
                    key={mosque.id}
                    role={hasGps ? 'button' : undefined}
                    tabIndex={hasGps ? 0 : undefined}
                    aria-disabled={!hasGps}
                    onClick={hasGps ? () => focusMosque(mosque) : undefined}
                    onKeyDown={
                      hasGps
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              focusMosque(mosque);
                            }
                          }
                        : undefined
                    }
                    className={`w-full rounded-lg border border-transparent p-2.5 text-left transition-all ${
                      hasGps
                        ? 'cursor-pointer hover:border-rmc-green/20 hover:bg-rmc-green/[0.04]'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rmc-green-light flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-rmc-green" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold leading-tight text-gray-900">{mosque.name}</h3>
                        {mosque.address && (
                          <p className="text-gray-500 text-[11px] mt-0.5 truncate">{mosque.address}</p>
                        )}
                        {mosque.imamName && (
                          <span className="mt-1 flex items-center gap-1.5">
                            <Avatar name={mosque.imamName} photo={mosque.imamPhoto} size={20} />
                            <span className="min-w-0 truncate text-[11px] text-gray-600">
                              <span className="text-gray-400">{t('imam')}:</span> {mosque.imamName}
                            </span>
                          </span>
                        )}
                        {hasGps && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDirections(mosque);
                            }}
                            className="text-rmc-green text-[11px] font-medium mt-1 inline-flex items-center gap-1 hover:underline"
                          >
                            <Navigation className="w-2.5 h-2.5" /> {t('directions')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-xs text-center py-3">{t('noMosques')}</p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-[20rem] sm:h-[34rem] lg:h-[38rem]">
        {geo && (
          <MosqueMap
            geo={geo}
            mosques={visible}
            selectedProvince={selectedProvince}
            onSelectProvince={pickProvince}
            focus={focus}
            directionsLabel={t('directions')}
            directionsTarget={directions}
            onRequestDirections={requestDirections}
            onClearDirections={() => setDirections(null)}
            locatingLabel={t('locating')}
            routeErrorLabel={t('locationError')}
            nearestLabel={t('nearest')}
            imamLabel={t('imam')}
            capacityLabel={t('capacity')}
            jumuahLabel={t('jumuah')}
          />
        )}
      </div>
    </div>
  );
}
