'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraduationCap, Navigation, Search, X, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FeatureCollection } from 'geojson';
import { SCHOOLS, SCHOOL_LEVELS, LEVEL_COLORS, type School, type SchoolLevel } from './data';
import { schoolsApi } from '@/lib/schoolsApi';
import type { MapSchool, DirectionsTarget } from './SchoolMap';

// Leaflet touches `window`, so the map must only load on the client.
const SchoolMap = dynamic(() => import('./SchoolMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

const PROVINCE_NAMES: Record<string, string> = {
  KIG: 'Kigali City',
  NOR: 'Northern Province',
  SOU: 'Southern Province',
  EAS: 'Eastern Province',
  WES: 'Western Province',
};

export function SchoolFinder() {
  const t = useTranslations('schools');

  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [level, setLevel] = useState<SchoolLevel | ''>('');
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

  const levelLabel = (lvl: string) => t(`level.${lvl}`);
  const levelLabels = useMemo(
    () => Object.fromEntries(SCHOOL_LEVELS.map((l) => [l, t(`level.${l}`)])),
    [t],
  );

  // Live schools from the API; fall back to the curated static list if the API
  // is unavailable or returns nothing (so the map always works).
  const [rows, setRows] = useState<School[]>(SCHOOLS);
  useEffect(() => {
    schoolsApi
      .list()
      .then((list) => {
        if (!list.length) return;
        setRows(
          list.map((s) => ({
            id: s.id,
            name: s.name,
            district: s.district ?? '',
            provinceCode: s.provinceCode ?? '',
            level: s.level,
            principal: s.principalName,
            phone: s.phone,
            email: s.email,
            gpsLat: s.gpsLat ?? 0,
            gpsLng: s.gpsLng ?? 0,
          })),
        );
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, []);

  // Map into the shape the map needs (with localized level labels).
  const schools: MapSchool[] = useMemo(
    () =>
      rows.map((s) => ({
        id: s.id,
        name: s.name,
        district: s.district,
        level: s.level,
        levelLabel: levelLabel(s.level),
        principal: s.principal,
        phone: s.phone,
        gpsLat: s.gpsLat,
        gpsLng: s.gpsLng,
        provinceCode: s.provinceCode,
      })),
    // levelLabel depends only on the (stable) translator
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  const provinceName = selectedProvince ? PROVINCE_NAMES[selectedProvince] ?? null : null;

  // Search by name spans everything; otherwise filter by province + level.
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      schools.filter((s) => {
        if (level && s.level !== level) return false;
        if (q) return s.name.toLowerCase().includes(q);
        if (selectedProvince) return s.provinceCode === selectedProvince;
        return true;
      }),
    [schools, q, selectedProvince, level],
  );

  const pickProvince = (code: string | null) => {
    setSelectedProvince(code);
    setQuery('');
    setFocus(null);
  };

  const focusSchool = (s: MapSchool) => {
    if (s.gpsLat != null && s.gpsLng != null) {
      setFocus({ lat: s.gpsLat, lng: s.gpsLng, nonce: nonce.current++ });
    }
  };

  const requestDirections = (s: MapSchool) => {
    if (s.gpsLat != null && s.gpsLng != null) {
      setDirections({ school: s, nonce: nonce.current++ });
    }
  };

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-sm sm:block">
      {/* Search + results panel — stacked above the map on mobile, floating overlay on sm+ */}
      <div className="z-[1000] flex max-h-[20rem] flex-col overflow-hidden border-b border-gray-100 bg-white sm:absolute sm:left-3.5 sm:top-3.5 sm:max-h-[calc(100%-1.75rem)] sm:w-72 sm:rounded-2xl sm:border sm:border-black/5 sm:bg-white/90 sm:shadow-lg sm:ring-1 sm:ring-black/5 sm:backdrop-blur-md md:w-80">
        <div className="space-y-2.5 p-3">
          {/* Name search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-gray-200 bg-white/70 py-2 pl-8 pr-8 text-sm outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-rmc-green/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('clear')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Level filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setLevel('')}
              aria-pressed={level === ''}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                level === '' ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('allLevels')}
            </button>
            {SCHOOL_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                aria-pressed={level === lvl}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  level === lvl ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(`level.${lvl}`)}
              </button>
            ))}
          </div>

          {/* Active province chip / hint */}
          <div className="flex items-center gap-2 text-xs">
            {selectedProvince ? (
              <button
                type="button"
                onClick={() => pickProvince(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green-light px-2.5 py-1 font-medium text-rmc-green-dark transition-colors hover:bg-rmc-green/15"
              >
                <MapPin className="h-3 w-3" />
                {provinceName}
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="leading-snug text-gray-400">{t('mapHint')}</span>
            )}
          </div>
        </div>

        {/* Results (scrolls within the panel) */}
        <div className="overflow-y-auto border-t border-gray-100 px-3 py-2.5">
          {visible.length > 0 ? (
            <div className="space-y-1.5">
              {visible.map((school) => (
                <div
                  key={school.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => focusSchool(school)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      focusSchool(school);
                    }
                  }}
                  className="w-full cursor-pointer rounded-lg border border-transparent p-2.5 text-left transition-all hover:border-rmc-green/20 hover:bg-rmc-green/[0.04]"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${LEVEL_COLORS[school.level] ?? '#0d3d24'}1a` }}
                    >
                      <GraduationCap
                        className="h-3.5 w-3.5"
                        style={{ color: LEVEL_COLORS[school.level] ?? '#0d3d24' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold leading-tight text-gray-900">{school.name}</h3>
                      <span
                        className="mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${LEVEL_COLORS[school.level] ?? '#0d3d24'}1a`,
                          color: LEVEL_COLORS[school.level] ?? '#0d3d24',
                        }}
                      >
                        {school.levelLabel}
                      </span>
                      {school.district && (
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">{school.district}</p>
                      )}
                      {school.phone && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-600">
                          <Phone className="h-2.5 w-2.5 text-gray-400" /> {school.phone}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDirections(school);
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-rmc-green hover:underline"
                      >
                        <Navigation className="h-2.5 w-2.5" /> {t('directions')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-gray-400">{t('noResults')}</p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-[20rem] sm:h-[34rem] lg:h-[38rem]">
        {geo && (
          <SchoolMap
            geo={geo}
            schools={visible}
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
            levelLabels={levelLabels}
          />
        )}
      </div>
    </div>
  );
}
