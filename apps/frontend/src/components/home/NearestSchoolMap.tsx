'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { publicApi } from '@/lib/public-api';

export interface SchoolPoint {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

/* Sample Islamic schools & mosques across Rwanda — used until the backend has
   real data so the map is never empty. Mirrors the placeholder set the contact
   finder uses. */
const PLACEHOLDER_SCHOOLS: SchoolPoint[] = [
  { id: 's-kig-1', name: 'Nyamirambo Islamic School', address: 'Nyamirambo, Kigali', lat: -1.9806, lng: 30.0469 },
  { id: 's-kig-2', name: 'Kigali Islamic Centre', address: 'Nyarugenge, Kigali', lat: -1.9495, lng: 30.0588 },
  { id: 's-nor-1', name: 'Musanze Madrasa', address: 'Musanze, Northern Province', lat: -1.4998, lng: 29.634 },
  { id: 's-sou-1', name: 'Huye Jamia Institute', address: 'Huye, Southern Province', lat: -2.5967, lng: 29.739 },
  { id: 's-eas-1', name: 'Rwamagana Islamic School', address: 'Rwamagana, Eastern Province', lat: -1.9487, lng: 30.4347 },
  { id: 's-wes-1', name: 'Rubavu Islamic Centre', address: 'Rubavu, Western Province', lat: -1.6777, lng: 29.258 },
];

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

const schoolIcon = L.divIcon({
  className: 'rmc-school-pin',
  html: `<svg width="24" height="34" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#0d3d24"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [24, 34],
  iconAnchor: [12, 34],
  popupAnchor: [0, -30],
});

const nearestIcon = L.divIcon({
  className: 'rmc-school-pin-nearest',
  html: `<svg width="30" height="42" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#D4A017"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
});

const userIcon = L.divIcon({
  className: 'rmc-user-pin',
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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

function FlyTo({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo(to, 13, { duration: 0.8 });
  }, [to, map]);
  return null;
}

interface Props {
  locateLabel: string;
  locatingLabel: string;
  nearestLabel: string;
  directionsLabel: string;
}

export default function NearestSchoolMap({
  locateLabel,
  locatingLabel,
  nearestLabel,
  directionsLabel,
}: Props) {
  const [schools, setSchools] = useState<SchoolPoint[]>(PLACEHOLDER_SCHOOLS);
  const [user, setUser] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull real mosques/schools when available; keep placeholders otherwise.
  useEffect(() => {
    let active = true;
    publicApi
      .getMosques()
      .then((list) => {
        if (!active) return;
        const mapped = list
          .filter((m) => m.gpsLat != null && m.gpsLng != null)
          .map((m) => ({
            id: m.id,
            name: m.name,
            address: m.address,
            lat: m.gpsLat as number,
            lng: m.gpsLng as number,
          }));
        if (mapped.length) setSchools(mapped);
      })
      .catch(() => {/* keep placeholders */});
    return () => {
      active = false;
    };
  }, []);

  const nearest = useMemo(() => {
    if (!user || !schools.length) return null;
    return schools
      .map((s) => ({ s, km: haversineKm(user, [s.lat, s.lng]) }))
      .sort((a, b) => a.km - b.km)[0];
  }, [user, schools]);

  const locateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUser([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setError('Could not get your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const flyTarget: [number, number] | null = nearest
    ? [nearest.s.lat, nearest.s.lng]
    : user;

  return (
    <div className="relative h-72 sm:h-80 w-full">
      <MapContainer
        center={RWANDA_CENTER}
        zoom={7}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
        style={{ background: '#eef2ee' }}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo to={flyTarget} />

        {user && (
          <>
            <Marker position={user} icon={userIcon} />
            {nearest && (
              <Polyline
                positions={[user, [nearest.s.lat, nearest.s.lng]]}
                pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.8, dashArray: '6 6' }}
              />
            )}
          </>
        )}

        {schools.map((s) => {
          const isNearest = nearest?.s.id === s.id;
          return (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={isNearest ? nearestIcon : schoolIcon}>
              <Popup>
                <span className="block font-semibold text-gray-900">{s.name}</span>
                {s.address && <span className="block text-gray-500 text-xs mt-0.5">{s.address}</span>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-rmc-green text-xs font-medium hover:underline"
                >
                  <Navigation className="w-3 h-3" /> {directionsLabel}
                </a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Locate control */}
      <button
        type="button"
        onClick={locateMe}
        className="absolute top-3 left-3 z-[1000] inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white/95 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:text-rmc-green"
      >
        <LocateFixed className="h-4 w-4" />
        {locating ? locatingLabel : locateLabel}
      </button>

      {/* Nearest badge */}
      {nearest && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full border border-rmc-gold/30 bg-white/95 px-3.5 py-1.5 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          <span className="font-semibold text-rmc-gold">{nearestLabel}:</span>
          <span className="truncate font-medium text-gray-800">{nearest.s.name}</span>
          <span className="shrink-0 text-gray-500">· {nearest.km.toFixed(1)} km</span>
        </div>
      )}

      {error && (
        <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow">
          {error}
        </div>
      )}
    </div>
  );
}
