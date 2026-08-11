'use client';

import type { FeatureCollection } from 'geojson';
import { Clock, Phone, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { PlaceFinderMap } from '@/components/maps/PlaceFinderMap';
import type { Focus } from '@/components/maps/controls';

export { provinceCodeFromName } from '@/components/maps/provinces';

export interface MapMosque {
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
  provinceCode: string | null;
}

export interface DirectionsTarget {
  mosque: MapMosque;
  nonce: number;
}

interface Props {
  geo: FeatureCollection;
  mosques: MapMosque[];
  selectedProvince: string | null;
  onSelectProvince: (code: string | null) => void;
  focus: Focus | null;
  directionsLabel: string;
  directionsTarget: DirectionsTarget | null;
  onRequestDirections: (m: MapMosque) => void;
  onClearDirections: () => void;
  locatingLabel: string;
  routeErrorLabel: string;
  nearestLabel: string;
  imamLabel: string;
  capacityLabel: string;
  jumuahLabel: string;
}

/**
 * The mosque finder map.
 *
 * Everything structural — province overlay, nearest highlighting, routing,
 * camera behaviour — comes from PlaceFinderMap, which the schools finder also
 * uses. What's left here is the part that is genuinely about mosques: the popup.
 */
export default function MosqueMap({
  geo,
  mosques,
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
  imamLabel,
  capacityLabel,
  jumuahLabel,
}: Props) {
  return (
    <PlaceFinderMap
      geo={geo}
      places={mosques}
      selectedProvince={selectedProvince}
      onSelectProvince={onSelectProvince}
      focus={focus}
      directionsTarget={directionsTarget ? { place: directionsTarget.mosque, nonce: directionsTarget.nonce } : null}
      onRequestDirections={onRequestDirections}
      onClearDirections={onClearDirections}
      labels={{
        directions: directionsLabel,
        locating: locatingLabel,
        routeError: routeErrorLabel,
        nearest: nearestLabel,
      }}
      renderPopup={(m) => (
        <>
          {m.address && <span className="mt-0.5 block text-xs text-gray-500">{m.address}</span>}

          {(m.capacity != null || m.fridayPrayerTime || m.phone) && (
            <span className="mt-1.5 flex flex-col gap-1 text-[11px] text-gray-600">
              {m.capacity != null && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 shrink-0 text-gray-400" />
                  {capacityLabel}:{' '}
                  <span className="font-medium text-gray-800">{m.capacity.toLocaleString()}</span>
                </span>
              )}
              {m.fridayPrayerTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                  {jumuahLabel}:{' '}
                  <span className="font-medium text-gray-800">{m.fridayPrayerTime.slice(0, 5)}</span>
                </span>
              )}
              {m.phone && (
                <a
                  href={`tel:${m.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-1.5 hover:underline"
                >
                  <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-800">{m.phone}</span>
                </a>
              )}
            </span>
          )}

          {m.imamName && (
            <span className="mt-1.5 flex items-center gap-2">
              <Avatar name={m.imamName} photo={m.imamPhoto} size={30} />
              <span className="leading-tight">
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">{imamLabel}</span>
                <span className="block text-xs font-medium text-gray-800">{m.imamName}</span>
                {m.imamPhone && (
                  <a
                    href={`tel:${m.imamPhone.replace(/\s+/g, '')}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-rmc-green hover:underline"
                  >
                    <Phone className="h-2.5 w-2.5 shrink-0" /> {m.imamPhone}
                  </a>
                )}
              </span>
            </span>
          )}
        </>
      )}
    />
  );
}
