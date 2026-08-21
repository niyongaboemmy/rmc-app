/** Geographic helpers shared by every map. */

export type LatLng = [number, number];

/** Anything a map can drop a pin on. Mosques, schools and cemeteries all satisfy it. */
export interface MapPlace {
  id: string;
  name: string;
  gpsLat: number | null;
  gpsLng: number | null;
}

/**
 * Great-circle distance in kilometres.
 *
 * Used to pick the nearest place and to estimate the straight-line fallback when
 * road routing is unavailable. Previously copy-pasted, identically, into three
 * separate map components.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Narrow a list to the places that actually have coordinates to plot. */
export function located<T extends MapPlace>(places: T[]): (T & { gpsLat: number; gpsLng: number })[] {
  return places.filter(
    (p): p is T & { gpsLat: number; gpsLng: number } => p.gpsLat != null && p.gpsLng != null,
  );
}

export interface NearestPlace<T> {
  place: T;
  id: string;
  km: number;
  pos: LatLng;
}

/**
 * The place closest to `from`, or null when the user's position is unknown or
 * nothing on the map has coordinates.
 */
export function nearestTo<T extends MapPlace>(from: LatLng | null, places: T[]): NearestPlace<T> | null {
  if (!from) return null;

  let best: NearestPlace<T> | null = null;
  for (const place of located(places)) {
    const pos: LatLng = [place.gpsLat, place.gpsLng];
    const km = haversineKm(from, pos);
    if (!best || km < best.km) best = { place, id: place.id, km, pos };
  }
  return best;
}
