import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import { MAP_COLORS } from './constants';

/** The GeoJSON province features carry their name here. */
interface ProvinceProperties {
  shapeName?: string;
}

/** Map a GeoJSON province `shapeName` to the backend province `code`. */
export function provinceCodeFromName(name: string): string | null {
  const n = (name || '').toLowerCase();
  if (n.includes('kigali')) return 'KIG';
  if (n.includes('north')) return 'NOR';
  if (n.includes('south')) return 'SOU';
  if (n.includes('east')) return 'EAS';
  if (n.includes('west')) return 'WES';
  return null;
}

/** The province code for a feature, or null when the name doesn't match one. */
export function codeOf(feature?: Feature): string | null {
  return provinceCodeFromName((feature?.properties as ProvinceProperties)?.shapeName ?? '');
}

/** Fill/stroke for a province region, emphasised while it is the selected one. */
export function provinceStyle(selected: boolean): L.PathOptions {
  return {
    color: MAP_COLORS.province,
    weight: selected ? 2.5 : 1.2,
    fillColor: selected ? MAP_COLORS.province : MAP_COLORS.provinceFill,
    fillOpacity: selected ? 0.25 : 0.08,
  };
}

/** Opacity used while hovering a province, before it is selected. */
export const PROVINCE_HOVER_OPACITY = 0.32;

/** Bounds of one province, or of the whole country when no code is given. */
export function provinceBounds(geo: FeatureCollection, code: string | null): L.LatLngBounds | null {
  if (!code) return L.geoJSON(geo).getBounds();

  const feature = geo.features.find((f) => codeOf(f) === code);
  if (!feature) return null;

  const bounds = L.geoJSON(feature).getBounds();
  return bounds.isValid() ? bounds : null;
}
