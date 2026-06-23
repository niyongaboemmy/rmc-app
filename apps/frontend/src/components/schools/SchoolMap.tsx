'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import { Navigation, X, GraduationCap, Phone } from 'lucide-react';
import { LEVEL_COLORS } from './data';
import 'leaflet/dist/leaflet.css';

export interface MapSchool {
  id: string;
  name: string;
  district: string | null;
  level: string;
  levelLabel: string;
  principal: string | null;
  phone: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  provinceCode: string | null;
}

export interface DirectionsTarget {
  school: MapSchool;
  nonce: number;
}

type DirStatus = 'idle' | 'locating' | 'routing' | 'error';

/** Map a GeoJSON province `shapeName` to the province `code`. */
export function provinceCodeFromName(name: string): string | null {
  const n = (name || '').toLowerCase();
  if (n.includes('kigali')) return 'KIG';
  if (n.includes('north')) return 'NOR';
  if (n.includes('south')) return 'SOU';
  if (n.includes('east')) return 'EAS';
  if (n.includes('west')) return 'WES';
  return null;
}

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

// OpenRouteService key — client-side, so it must be NEXT_PUBLIC_*. When absent
// we fall back to a straight-line route so the feature still works in dev.
const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

const DEFAULT_PIN_COLOR = '#0d3d24';

/* Build a coloured map pin as a divIcon — avoids the broken-image issue
   Leaflet's default PNG markers hit under bundlers (the icon URLs don't
   resolve through webpack). */
function makePin(color: string): L.DivIcon {
  return L.divIcon({
    className: 'rmc-school-pin',
    html: `<svg width="26" height="38" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="4.6" fill="#fff"/>
    </svg>`,
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  });
}

const LEVEL_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(LEVEL_COLORS).map(([level, color]) => [level, makePin(color)]),
);
const defaultIcon = makePin(DEFAULT_PIN_COLOR);

/* Amber pin for the school nearest the user — larger, with a glow so it stands
   out from the green pins. */
const nearestIcon = L.divIcon({
  className: 'rmc-school-pin rmc-school-pin--nearest',
  html: `<svg width="34" height="50" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#f59e0b"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [34, 50],
  iconAnchor: [17, 50],
  popupAnchor: [0, -46],
});

/* Blue dot for the user's current position. */
const userIcon = L.divIcon({
  className: 'rmc-user-pin',
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.35)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function provinceStyle(selected: boolean): L.PathOptions {
  return {
    color: '#0d3d24',
    weight: selected ? 2.5 : 1.2,
    fillColor: selected ? '#0d3d24' : '#15803d',
    fillOpacity: selected ? 0.25 : 0.08,
  };
}

/** Great-circle distance in km — used for the straight-line fallback. */
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Fit the map to the selected province's bounds whenever the selection changes. */
function FitToProvince({ geo, code }: { geo: FeatureCollection; code: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!code) {
      map.flyToBounds(L.geoJSON(geo).getBounds(), { padding: [16, 16], duration: 0.6 });
      return;
    }
    const feature = geo.features.find(
      (f) => provinceCodeFromName((f.properties as { shapeName?: string })?.shapeName ?? '') === code,
    );
    if (!feature) return;
    const bounds = L.geoJSON(feature).getBounds();
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [24, 24], duration: 0.7 });
  }, [code, geo, map]);
  return null;
}

/** Fly to a focused school (e.g. picked from the list or search). */
function FlyToSchool({ focus }: { focus: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 15, { duration: 0.8 });
  }, [focus, map]);
  return null;
}

/**
 * Zoom to the school nearest the user once it's resolved — but only on the first
 * load and only while the user hasn't taken over (no province picked, no manual
 * focus), so we never yank the map out from under them.
 */
function FlyToNearest({ pos, enabled }: { pos: [number, number] | null; enabled: boolean }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!pos || done.current || !enabled) return;
    done.current = true;
    map.flyTo(pos, 13, { duration: 0.9 });
  }, [pos, enabled, map]);
  return null;
}

/**
 * Draws a route from the user's GPS position to the target school. Uses the
 * OpenRouteService directions API for a real road route; if no key is set or
 * the request fails, falls back to a straight line. Reports status + the
 * distance/duration back to the parent for the on-map badge.
 */
function DirectionsLayer({
  target,
  onStatus,
  onInfo,
}: {
  target: DirectionsTarget | null;
  onStatus: (s: DirStatus) => void;
  onInfo: (info: { km: number; min: number | null } | null) => void;
}) {
  const map = useMap();
  const [user, setUser] = useState<[number, number] | null>(null);
  const [line, setLine] = useState<[number, number][] | null>(null);

  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const onInfoRef = useRef(onInfo);
  onInfoRef.current = onInfo;

  useEffect(() => {
    if (!target || target.school.gpsLat == null || target.school.gpsLng == null) {
      setUser(null);
      setLine(null);
      onInfoRef.current(null);
      onStatusRef.current('idle');
      return;
    }

    const dest: [number, number] = [target.school.gpsLat, target.school.gpsLng];
    let cancelled = false;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onStatusRef.current('error');
      return;
    }

    onStatusRef.current('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const origin: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUser(origin);
        onStatusRef.current('routing');

        try {
          if (!ORS_KEY) throw new Error('no-key');
          const url =
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}` +
            `&start=${origin[1]},${origin[0]}&end=${dest[1]},${dest[0]}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('ors-failed');
          const data = await res.json();
          const feature = data.features?.[0];
          const coords: [number, number][] = feature.geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]] as [number, number],
          );
          if (cancelled) return;
          setLine(coords);
          onInfoRef.current({
            km: feature.properties.summary.distance / 1000,
            min: Math.round(feature.properties.summary.duration / 60),
          });
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
          onStatusRef.current('idle');
        } catch {
          if (cancelled) return;
          // Straight-line fallback (no key / API error).
          const coords: [number, number][] = [origin, dest];
          setLine(coords);
          onInfoRef.current({ km: haversineKm(origin, dest), min: null });
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
          onStatusRef.current('idle');
        }
      },
      () => {
        if (!cancelled) onStatusRef.current('error');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );

    return () => {
      cancelled = true;
    };
  }, [target, map]);

  return (
    <>
      {user && <Marker position={user} icon={userIcon} />}
      {line && (
        <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }} />
      )}
    </>
  );
}

interface Props {
  geo: FeatureCollection;
  schools: MapSchool[];
  selectedProvince: string | null;
  onSelectProvince: (code: string | null) => void;
  focus: { lat: number; lng: number; nonce: number } | null;
  directionsLabel: string;
  directionsTarget: DirectionsTarget | null;
  onRequestDirections: (s: MapSchool) => void;
  onClearDirections: () => void;
  locatingLabel: string;
  routeErrorLabel: string;
  nearestLabel: string;
  /** Localized label per level key, for the colour legend. */
  levelLabels: Record<string, string>;
}

export default function SchoolMap({
  geo,
  schools,
  selectedProvince,
  onSelectProvince,
  focus,
  directionsLabel,
  directionsTarget,
  onRequestDirections,
  onClearDirections,
  locatingLabel,
  routeErrorLabel,
  nearestLabel,
  levelLabels,
}: Props) {
  const [status, setStatus] = useState<DirStatus>('idle');
  const [info, setInfo] = useState<{ km: number; min: number | null } | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Ask for the user's location once on mount so we can highlight the nearest
  // school. Failure (denied / unsupported) just leaves every pin green.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // The school closest to the user, among those currently shown.
  const nearest = useMemo(() => {
    if (!userPos) return null;
    let best: { id: string; km: number; pos: [number, number] } | null = null;
    for (const s of schools) {
      if (s.gpsLat == null || s.gpsLng == null) continue;
      const km = haversineKm(userPos, [s.gpsLat, s.gpsLng]);
      if (!best || km < best.km) best = { id: s.id, km, pos: [s.gpsLat, s.gpsLng] };
    }
    return best;
  }, [userPos, schools]);
  const nearestId = nearest?.id ?? null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={RWANDA_CENTER}
        zoom={8}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
        style={{ background: '#eef2ee' }}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Clickable province regions */}
        <GeoJSON
          key={selectedProvince ?? 'all'}
          data={geo}
          style={(feature?: Feature) =>
            provinceStyle(
              provinceCodeFromName((feature?.properties as { shapeName?: string })?.shapeName ?? '') ===
                selectedProvince,
            )
          }
          onEachFeature={(feature, layer) => {
            const code = provinceCodeFromName(
              (feature.properties as { shapeName?: string })?.shapeName ?? '',
            );
            layer.on({
              click: () => onSelectProvince(code),
              mouseover: (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.32 }),
              mouseout: (e) =>
                (e.target as L.Path).setStyle(provinceStyle(code === selectedProvince)),
            });
          }}
        />

        <FitToProvince geo={geo} code={selectedProvince} />
        <FlyToSchool focus={focus} />
        <FlyToNearest pos={nearest?.pos ?? null} enabled={!selectedProvince && !focus} />
        <DirectionsLayer target={directionsTarget} onStatus={setStatus} onInfo={setInfo} />

        {/* School markers */}
        {schools
          .filter((s) => s.gpsLat != null && s.gpsLng != null)
          .map((s) => {
            const isNearest = s.id === nearestId;
            return (
              <Marker
                key={s.id}
                position={[s.gpsLat as number, s.gpsLng as number]}
                icon={isNearest ? nearestIcon : LEVEL_ICONS[s.level] ?? defaultIcon}
                zIndexOffset={isNearest ? 1000 : 0}
              >
                <Popup>
                  {isNearest && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {nearestLabel}
                    </span>
                  )}
                  <span className="block font-semibold text-gray-900">{s.name}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-rmc-green-light px-2 py-0.5 text-[10px] font-semibold text-rmc-green-dark">
                    <GraduationCap className="h-2.5 w-2.5" /> {s.levelLabel}
                  </span>
                  {s.district && <span className="mt-1 block text-xs text-gray-500">{s.district}</span>}
                  {s.principal && (
                    <span className="mt-0.5 block text-xs text-gray-600">{s.principal}</span>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone.replace(/\s+/g, '')}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {s.phone}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRequestDirections(s)}
                    className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rmc-green hover:underline"
                  >
                    <Navigation className="h-3 w-3" /> {directionsLabel}
                  </button>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Directions status / distance badge */}
      {directionsTarget && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-gray-100 bg-white/95 px-3.5 py-1.5 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          {status === 'locating' || status === 'routing' ? (
            <span className="text-gray-600">{locatingLabel}</span>
          ) : status === 'error' ? (
            <span className="text-red-600">{routeErrorLabel}</span>
          ) : info ? (
            <span className="font-medium text-gray-800">
              {info.km.toFixed(1)} km{info.min != null ? ` · ${info.min} min` : ''}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClearDirections}
            aria-label="Clear directions"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Level colour legend */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-gray-100 bg-white/95 px-3 py-2 shadow ring-1 ring-black/5 backdrop-blur">
        <ul className="space-y-1">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <li key={level} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {levelLabels[level] ?? level}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
