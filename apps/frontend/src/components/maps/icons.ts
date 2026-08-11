import L from 'leaflet';
import { MAP_COLORS } from './constants';

/**
 * The app's map markers.
 *
 * All of these are `divIcon`s holding inline SVG rather than Leaflet's default
 * PNG markers, whose icon URLs don't resolve through the bundler and render as
 * broken images. Every map component had rebuilt this set by hand, which is how
 * the same "nearest" pin ended up amber on two pages and gold on a third.
 */

const TEARDROP_PATH =
  'M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z';

/** Ordinary pin size. Anchored at the tip, so the point sits on the coordinate. */
const PIN_W = 26;
const PIN_H = 38;

/** The nearest pin is deliberately larger so it reads as "this one" at a glance. */
const NEAREST_W = 34;
const NEAREST_H = 50;

function teardrop(color: string, w: number, h: number, glow = false): string {
  const filter = glow ? ' style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))"' : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${filter}>
    <path d="${TEARDROP_PATH}" fill="${color}"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`;
}

/**
 * A place pin in an arbitrary colour — used by the schools map, which colours
 * pins by education level. Pass nothing for the standard RMC green.
 */
export function makePin(color: string = MAP_COLORS.pin): L.DivIcon {
  return L.divIcon({
    className: 'rmc-map-pin',
    html: teardrop(color, PIN_W, PIN_H),
    iconSize: [PIN_W, PIN_H],
    iconAnchor: [PIN_W / 2, PIN_H],
    popupAnchor: [0, -(PIN_H - 4)],
  });
}

/** The standard green pin, shared by every map. */
export const placePin = makePin();

/** Amber, larger, with a drop shadow — the place nearest the user. */
export const nearestPin = L.divIcon({
  className: 'rmc-map-pin rmc-map-pin--nearest',
  html: teardrop(MAP_COLORS.nearest, NEAREST_W, NEAREST_H, true),
  iconSize: [NEAREST_W, NEAREST_H],
  iconAnchor: [NEAREST_W / 2, NEAREST_H],
  popupAnchor: [0, -(NEAREST_H - 4)],
});

/** Blue dot for the user's own position. */
export const userPin = L.divIcon({
  className: 'rmc-user-pin',
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${MAP_COLORS.user};border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.35)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Marker z-index bump so the nearest pin is never hidden behind an ordinary one. */
export const NEAREST_Z_OFFSET = 1000;
