'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import type { LatLng } from './geo';
import { provinceBounds } from './provinces';

/**
 * Headless components that drive the map camera. Each was written separately in
 * three or four map files with the same body and a different entity in its name
 * (`FlyToMosque`, `FlyToSchool`, `FlyTo`…).
 */

/** A focus request. `nonce` lets the same coordinates re-trigger a fly-to. */
export interface Focus {
  lat: number;
  lng: number;
  nonce: number;
}

/** Fly to a focused place — e.g. one picked from the list beside the map. */
export function FlyToFocus({ focus, zoom = 15 }: { focus: Focus | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], zoom, { duration: 0.8 });
  }, [focus, zoom, map]);
  return null;
}

/**
 * Fly to a position exactly once, and only while `enabled`.
 *
 * Used for "zoom to the nearest place on first load": if it ran on every change
 * it would yank the map away from wherever the user had since panned.
 */
export function FlyToOnce({
  pos,
  enabled,
  zoom = 13,
}: {
  pos: LatLng | null;
  enabled: boolean;
  zoom?: number;
}) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!pos || done.current || !enabled) return;
    done.current = true;
    map.flyTo(pos, zoom, { duration: 0.9 });
  }, [pos, enabled, zoom, map]);
  return null;
}

/** Fit the map to the selected province, or to the whole country when none is. */
export function FitToProvince({ geo, code }: { geo: FeatureCollection; code: string | null }) {
  const map = useMap();
  useEffect(() => {
    const bounds = provinceBounds(geo, code);
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: code ? [24, 24] : [16, 16], duration: code ? 0.7 : 0.6 });
  }, [code, geo, map]);
  return null;
}

/** Fit the map to every plotted point — used by directories with no province filter. */
export function FitToPoints({ points, maxZoom = 12 }: { points: LatLng[]; maxZoom?: number }) {
  const map = useMap();
  // Bounds are derived from the coordinates themselves so a new array with the
  // same points doesn't re-fit the map and interrupt the user.
  const key = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxZoom, map]);
  return null;
}
