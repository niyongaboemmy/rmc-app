'use client';

import { Marker, Popup } from 'react-leaflet';
import { Navigation } from 'lucide-react';
import { RwandaMap } from '@/components/maps/RwandaMap';
import { FitToPoints, FlyToFocus, type Focus } from '@/components/maps/controls';
import { placePin } from '@/components/maps/icons';
import type { LatLng } from '@/components/maps/geo';
import type { Cemetery } from './types';

type LocatedCemetery = Cemetery & { lat: number; lng: number };

function located(cemeteries: Cemetery[]): LocatedCemetery[] {
  return cemeteries.filter((c): c is LocatedCemetery => c.lat != null && c.lng != null);
}

/**
 * The cemetery directory map.
 *
 * A plain directory — no province filter, no nearest-to-you, no routing — so it
 * uses the shared shell and pin directly rather than PlaceFinderMap. Cemeteries
 * carry `lat`/`lng` rather than the `gpsLat`/`gpsLng` the finder types use,
 * which is why they aren't `MapPlace`s.
 */
export default function CemeteryMap({
  cemeteries,
  focus,
  directionsLabel,
}: {
  cemeteries: Cemetery[];
  focus: Focus | null;
  directionsLabel: string;
}) {
  const pins = located(cemeteries);
  const points: LatLng[] = pins.map((c) => [c.lat, c.lng]);

  return (
    <RwandaMap>
      <FitToPoints points={points} />
      <FlyToFocus focus={focus} zoom={14} />

      {pins.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={placePin}>
          <Popup>
            <span className="block font-semibold text-gray-900">{c.name}</span>
            <span className="mt-0.5 block text-xs text-gray-500">{c.address}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rmc-green hover:underline"
            >
              <Navigation className="h-3 w-3" /> {directionsLabel}
            </a>
          </Popup>
        </Marker>
      ))}
    </RwandaMap>
  );
}
