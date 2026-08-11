'use client';

import type { FeatureCollection } from 'geojson';
import { GraduationCap, Phone } from 'lucide-react';
import { PlaceFinderMap } from '@/components/maps/PlaceFinderMap';
import { makePin } from '@/components/maps/icons';
import type { Focus } from '@/components/maps/controls';
import { LEVEL_COLORS } from './data';

export { provinceCodeFromName } from '@/components/maps/provinces';

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

/** Pins are colour-coded by education level; built once, not per render. */
const LEVEL_ICONS = Object.fromEntries(
  Object.entries(LEVEL_COLORS).map(([level, color]) => [level, makePin(color)]),
);
const defaultIcon = makePin();

interface Props {
  geo: FeatureCollection;
  schools: MapSchool[];
  selectedProvince: string | null;
  onSelectProvince: (code: string | null) => void;
  focus: Focus | null;
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

/**
 * The schools finder map — the same PlaceFinderMap the mosque finder uses,
 * plus the two things specific to schools: level-coloured pins and their legend.
 */
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
  return (
    <PlaceFinderMap
      geo={geo}
      places={schools}
      selectedProvince={selectedProvince}
      onSelectProvince={onSelectProvince}
      focus={focus}
      directionsTarget={
        directionsTarget ? { place: directionsTarget.school, nonce: directionsTarget.nonce } : null
      }
      onRequestDirections={onRequestDirections}
      onClearDirections={onClearDirections}
      labels={{
        directions: directionsLabel,
        locating: locatingLabel,
        routeError: routeErrorLabel,
        nearest: nearestLabel,
      }}
      iconFor={(s) => LEVEL_ICONS[s.level] ?? defaultIcon}
      renderPopup={(s) => (
        <>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-rmc-green-light px-2 py-0.5 text-[10px] font-semibold text-rmc-green-dark">
            <GraduationCap className="h-2.5 w-2.5" /> {s.levelLabel}
          </span>
          {s.district && <span className="mt-1 block text-xs text-gray-500">{s.district}</span>}
          {s.principal && <span className="mt-0.5 block text-xs text-gray-600">{s.principal}</span>}
          {s.phone && (
            <a
              href={`tel:${s.phone.replace(/\s+/g, '')}`}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:underline"
            >
              <Phone className="h-3 w-3" /> {s.phone}
            </a>
          )}
        </>
      )}
      overlay={
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
      }
    />
  );
}
