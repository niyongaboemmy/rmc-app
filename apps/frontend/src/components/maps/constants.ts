/**
 * One source of truth for how every map in the app looks.
 *
 * These values were previously re-declared in each of the six map components,
 * and had drifted: the "nearest" pin was amber (#f59e0b) on the contact and
 * schools finders but gold (#D4A017) on the home/new-muslim map, pins came in
 * two sizes, the user dot in two more, and one tile attribution had lost the
 * word "contributors". Anything a map renders that is not specific to one page
 * belongs here.
 */

/** Geographic centre of Rwanda — the default view before anything is focused. */
export const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

/** Zoom that frames the whole country at typical map heights. */
export const RWANDA_ZOOM = 8;

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Shown while tiles load, so the frame never flashes white. */
export const MAP_BACKGROUND = '#eef2ee';

export const MAP_COLORS = {
  /** RMC green — every ordinary place pin. */
  pin: '#0d3d24',
  /** Amber — the one place nearest the user. */
  nearest: '#f59e0b',
  /** Blue — the user's own position, and the driving route. */
  user: '#2563eb',
  /** Walking route, dashed. */
  walking: '#1F8A4C',
  province: '#0d3d24',
  provinceFill: '#15803d',
} as const;

/**
 * OpenRouteService key for real road routing. Client-side, so it must be
 * NEXT_PUBLIC_*. When absent, DirectionsLayer falls back to a straight line with
 * estimated times, so directions still work in dev and on a fresh deploy.
 */
export const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

/** Shared geolocation options — high accuracy, give up after 10s. */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
};
