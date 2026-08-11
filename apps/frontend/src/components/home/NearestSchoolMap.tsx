'use client';

import { useEffect, useMemo, useState } from 'react';
import { Marker, Polyline, Popup } from 'react-leaflet';
import { LocateFixed, Navigation } from 'lucide-react';
import { publicApi } from '@/lib/public-api';

import { RwandaMap } from '@/components/maps/RwandaMap';
import { FlyToFocus } from '@/components/maps/controls';
import { MAP_COLORS } from '@/components/maps/constants';
import { nearestTo, type MapPlace } from '@/components/maps/geo';
import { NEAREST_Z_OFFSET, nearestPin, placePin, userPin } from '@/components/maps/icons';
import { useUserLocation } from '@/components/maps/useUserLocation';

export interface SchoolPoint extends MapPlace {
  address: string | null;
}

/* Sample Islamic schools & mosques across Rwanda — used until the backend has
   real data so the map is never empty. */
const PLACEHOLDER_SCHOOLS: SchoolPoint[] = [
  { id: 's-kig-1', name: 'Nyamirambo Islamic School', address: 'Nyamirambo, Kigali', gpsLat: -1.9806, gpsLng: 30.0469 },
  { id: 's-kig-2', name: 'Kigali Islamic Centre', address: 'Nyarugenge, Kigali', gpsLat: -1.9495, gpsLng: 30.0588 },
  { id: 's-nor-1', name: 'Musanze Madrasa', address: 'Musanze, Northern Province', gpsLat: -1.4998, gpsLng: 29.634 },
  { id: 's-sou-1', name: 'Huye Jamia Institute', address: 'Huye, Southern Province', gpsLat: -2.5967, gpsLng: 29.739 },
  { id: 's-eas-1', name: 'Rwamagana Islamic School', address: 'Rwamagana, Eastern Province', gpsLat: -1.9487, gpsLng: 30.4347 },
  { id: 's-wes-1', name: 'Rubavu Islamic Centre', address: 'Rubavu, Western Province', gpsLat: -1.6777, gpsLng: 29.258 },
];

interface Props {
  locateLabel: string;
  locatingLabel: string;
  nearestLabel: string;
  directionsLabel: string;
}

/**
 * The compact "find a mosque or school near you" map used on the home and
 * new-muslim pages.
 *
 * Same basemap, pins and colours as the full finders — those all come from
 * `components/maps` now, so the nearest pin can no longer be gold here and amber
 * there. What stays deliberately lighter is the interaction: a shorter frame, no
 * province overlay, no scroll-wheel capture mid-page, and location only on
 * request, because a homepage section shouldn't fire a permission prompt at a
 * visitor who never asked to be located.
 */
export default function NearestSchoolMap({
  locateLabel,
  locatingLabel,
  nearestLabel,
  directionsLabel,
}: Props) {
  const [places, setPlaces] = useState<SchoolPoint[]>(PLACEHOLDER_SCHOOLS);
  const { position, status, locate, isLocating } = useUserLocation();

  // Pull real mosques when available; keep placeholders otherwise.
  useEffect(() => {
    let active = true;
    publicApi
      .getMosques()
      .then((list) => {
        if (!active) return;
        const mapped = list
          .filter((m) => m.gpsLat != null && m.gpsLng != null)
          .map((m) => ({ id: m.id, name: m.name, address: m.address, gpsLat: m.gpsLat, gpsLng: m.gpsLng }));
        if (mapped.length) setPlaces(mapped);
      })
      .catch(() => {
        /* keep placeholders */
      });
    return () => {
      active = false;
    };
  }, []);

  const nearest = useMemo(() => nearestTo(position, places), [position, places]);

  // Frame the nearest place once located; failing that, the user themselves.
  const flyTarget = nearest?.pos ?? position;

  return (
    <div className="relative h-72 w-full sm:h-80">
      <RwandaMap zoom={7} scrollWheelZoom={false}>
        <FlyToFocus
          focus={flyTarget ? { lat: flyTarget[0], lng: flyTarget[1], nonce: 0 } : null}
          zoom={13}
        />

        {position && (
          <>
            <Marker position={position} icon={userPin} />
            {nearest && (
              <Polyline
                positions={[position, nearest.pos]}
                pathOptions={{ color: MAP_COLORS.user, weight: 3, opacity: 0.8, dashArray: '6 6' }}
              />
            )}
          </>
        )}

        {places.map((p) => {
          if (p.gpsLat == null || p.gpsLng == null) return null;
          const isNearest = nearest?.id === p.id;
          return (
            <Marker
              key={p.id}
              position={[p.gpsLat, p.gpsLng]}
              icon={isNearest ? nearestPin : placePin}
              zIndexOffset={isNearest ? NEAREST_Z_OFFSET : 0}
            >
              <Popup>
                {isNearest && (
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    {nearestLabel}
                  </span>
                )}
                <span className="block font-semibold text-gray-900">{p.name}</span>
                {p.address && <span className="mt-0.5 block text-xs text-gray-500">{p.address}</span>}
                {/* No on-map routing in the compact map, so this hands off to a
                    maps app — styled to match the finder's directions button. */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.gpsLat},${p.gpsLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rmc-green hover:underline"
                >
                  <Navigation className="h-3 w-3" /> {directionsLabel}
                </a>
              </Popup>
            </Marker>
          );
        })}
      </RwandaMap>

      {/* Locate control */}
      <button
        type="button"
        onClick={locate}
        className="absolute left-3 top-3 z-[1000] inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white/95 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:text-rmc-green"
      >
        <LocateFixed className="h-4 w-4" />
        {isLocating ? locatingLabel : locateLabel}
      </button>

      {/* Nearest badge */}
      {nearest && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full border border-gray-100 bg-white/95 px-3.5 py-1.5 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          <span className="font-semibold text-amber-600">{nearestLabel}:</span>
          <span className="truncate font-medium text-gray-800">{nearest.place.name}</span>
          <span className="shrink-0 text-gray-500">· {nearest.km.toFixed(1)} km</span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow">
          Could not get your location.
        </div>
      )}
    </div>
  );
}
