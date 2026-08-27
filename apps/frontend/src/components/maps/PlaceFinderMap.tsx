'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import { Car, Footprints, LocateFixed, Navigation, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { RwandaMap } from './RwandaMap';
import { DirectionsLayer, type DirectionsStatus, type DualRoute } from './DirectionsLayer';
import { FitToProvince, FlyToFocus, FlyToOnce, type Focus } from './controls';
import { nearestTo, located, type MapPlace } from './geo';
import { NEAREST_Z_OFFSET, nearestPin, placePin } from './icons';
import { codeOf, provinceStyle, PROVINCE_HOVER_OPACITY } from './provinces';
import { useUserLocation } from './useUserLocation';

export interface FinderLabels {
  directions: string;
  locating: string;
  routeError: string;
  nearest: string;
}

interface Props<T extends MapPlace> {
  /** Province polygons, used for the clickable region overlay. */
  geo: FeatureCollection;
  places: T[];
  selectedProvince: string | null;
  onSelectProvince: (code: string | null) => void;
  focus: Focus | null;
  directionsTarget: { place: T; nonce: number } | null;
  onRequestDirections: (place: T) => void;
  onClearDirections: () => void;
  labels: FinderLabels;
  /** Per-place pin, for maps that colour-code (schools by level). Defaults to RMC green. */
  iconFor?: (place: T) => L.DivIcon;
  /** The entity-specific body of a popup. The nearest badge, name and directions button are shared. */
  renderPopup: (place: T) => ReactNode;
  /** Extra absolutely-positioned chrome, e.g. the schools colour legend. */
  overlay?: ReactNode;
}

/**
 * The full-page place finder: clickable province overlay, nearest-to-you
 * highlighting, and on-map driving/walking directions.
 *
 * The mosque and school finders were two 490-line components that differed in
 * about 90 lines — the popup body, the pin colouring and the entity name. Both
 * are now thin wrappers over this, so a fix to routing, camera behaviour or the
 * nearest badge lands on both at once instead of on whichever was edited.
 */
export function PlaceFinderMap<T extends MapPlace>({
  geo,
  places,
  selectedProvince,
  onSelectProvince,
  focus,
  directionsTarget,
  onRequestDirections,
  onClearDirections,
  labels,
  iconFor,
  renderPopup,
  overlay,
}: Props<T>) {
  // Read here rather than threaded through every caller: mosques, schools and
  // cemeteries all say the same thing, so `labels` stays the per-finder vocabulary.
  const tCommon = useTranslations('common');
  const [status, setStatus] = useState<DirectionsStatus>('idle');
  const [info, setInfo] = useState<DualRoute | null>(null);

  // NOT asked for on mount. Opening a map is not consent to be located, and a browser
  // permission prompt that appears unbidden is usually dismissed — which left the page
  // having spent its one good chance to ask. The button asks at the moment the reader
  // has said what they want, which is also when a prompt is most likely to be granted.
  const { position, status: locateStatus, locate, isLocating } = useUserLocation();

  const nearest = useMemo(() => nearestTo(position, places), [position, places]);
  const nearestId = nearest?.id ?? null;

  const destination = useMemo(() => {
    const place = directionsTarget?.place;
    if (!place || place.gpsLat == null || place.gpsLng == null) return null;
    return { pos: [place.gpsLat, place.gpsLng] as [number, number], nonce: directionsTarget.nonce };
  }, [directionsTarget]);

  return (
    <div className="relative h-full w-full">
      <RwandaMap>
        {/* Clickable province regions */}
        <GeoJSON
          key={selectedProvince ?? 'all'}
          data={geo}
          style={(feature?: Feature) => provinceStyle(codeOf(feature) === selectedProvince)}
          onEachFeature={(feature, layer) => {
            const code = codeOf(feature);
            layer.on({
              click: () => onSelectProvince(code),
              mouseover: (e) => (e.target as L.Path).setStyle({ fillOpacity: PROVINCE_HOVER_OPACITY }),
              mouseout: (e) => (e.target as L.Path).setStyle(provinceStyle(code === selectedProvince)),
            });
          }}
        />

        <FitToProvince geo={geo} code={selectedProvince} />
        <FlyToFocus focus={focus} />
        {/* Only while the user hasn't taken over with a province or a selection. */}
        <FlyToOnce pos={nearest?.pos ?? null} enabled={!selectedProvince && !focus} />
        <DirectionsLayer destination={destination} onStatus={setStatus} onInfo={setInfo} />

        {located(places).map((place) => {
          const isNearest = place.id === nearestId;
          return (
            <Marker
              key={place.id}
              position={[place.gpsLat, place.gpsLng]}
              icon={isNearest ? nearestPin : iconFor?.(place) ?? placePin}
              zIndexOffset={isNearest ? NEAREST_Z_OFFSET : 0}
            >
              <Popup>
                {isNearest && (
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    {labels.nearest}
                  </span>
                )}
                <span className="block font-semibold text-gray-900">{place.name}</span>
                {renderPopup(place)}
                <button
                  type="button"
                  onClick={() => onRequestDirections(place)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rmc-green hover:underline"
                >
                  <Navigation className="h-3 w-3" /> {labels.directions}
                </button>
              </Popup>
            </Marker>
          );
        })}
      </RwandaMap>

      {/* Directions status / distance badge */}
      {directionsTarget && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-gray-100 bg-white/95 px-3.5 py-1.5 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          {status === 'locating' || status === 'routing' ? (
            <span className="text-gray-600">{labels.locating}</span>
          ) : status === 'error' ? (
            <span className="text-red-600">{labels.routeError}</span>
          ) : info ? (
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-medium text-gray-800">
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5 text-rmc-green" />
                {info.car.km.toFixed(1)} km{info.car.min != null ? ` · ${info.car.min} min` : ''}
              </span>
              <span className="flex items-center gap-1 border-l border-gray-200 pl-2.5">
                <Footprints className="h-3.5 w-3.5 text-rmc-green" />
                {info.foot.km.toFixed(1)} km{info.foot.min != null ? ` · ${info.foot.min} min` : ''}
              </span>
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

      {/* "Find near me" — the only thing that triggers locating, now that nothing asks
          on mount.

          Sits beside the finder's filter panel, level with its top. That panel is
          `sm:left-3.5 sm:top-3.5 sm:w-72 md:w-80` in BOTH finders, so the offsets here
          are its left edge plus its width plus a gap — 0.875 + 18 + 0.5, and again at
          md with 20. Change the panel's width and this has to follow; it is the price of
          aligning to a box the map does not own.

          Below sm the panel is static above the map rather than floating over it, so the
          corner is free and the button takes it.

          Nothing else contends: Leaflet's zoom is top-right, the schools legend
          bottom-left, the directions badge bottom-centre.

          Still hidden once a position is known — the nearest pin is highlighted and the
          camera has flown to it, so the button has nothing left to do. */}
      {!position && (
        <div className="absolute left-3 top-3 z-[1000] sm:left-[19.375rem] sm:top-3.5 md:left-[21.375rem]">
          <button
            type="button"
            onClick={locate}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur transition-colors hover:text-rmc-green disabled:opacity-60"
          >
            <LocateFixed className={cn('h-3.5 w-3.5 text-rmc-green', isLocating && 'animate-pulse')} />
            {isLocating ? tCommon('findNearMeLocating') : tCommon('findNearMe')}
          </button>
          {/* Denial is not an error state to shout about, but saying nothing at all is
              what made this look broken. */}
          {locateStatus === 'error' && (
            <p className="mt-1.5 max-w-[15rem] rounded-lg bg-white/90 px-2 py-1 text-[11px] leading-snug text-gray-600 shadow-sm backdrop-blur">
              {tCommon('findNearMeDenied')}
            </p>
          )}
        </div>
      )}

      {overlay}
    </div>
  );
}
