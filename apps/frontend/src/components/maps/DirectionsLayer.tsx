'use client';

import { useEffect, useRef, useState } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GEOLOCATION_OPTIONS, MAP_COLORS, ORS_KEY } from './constants';
import { haversineKm, type LatLng } from './geo';
import { userPin } from './icons';

export type DirectionsStatus = 'idle' | 'locating' | 'routing' | 'error';

export interface RouteInfo {
  km: number;
  min: number | null;
}

/** Driving and walking routes to the same destination, shown side by side. */
export interface DualRoute {
  car: RouteInfo;
  foot: RouteInfo;
}

/** Typical speeds for the straight-line fallback, in km/h. */
const DRIVING_KMH = 40;
const WALKING_KMH = 5;

interface OrsRoute {
  coords: LatLng[];
  km: number;
  min: number;
}

/** One OpenRouteService route for a travel profile (driving-car / foot-walking). */
async function fetchRoute(origin: LatLng, dest: LatLng, profile: string): Promise<OrsRoute> {
  const url =
    `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_KEY}` +
    `&start=${origin[1]},${origin[0]}&end=${dest[1]},${dest[0]}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('ors-failed');

  const data = await res.json();
  const feature = data.features?.[0];
  return {
    coords: feature.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng),
    km: feature.properties.summary.distance / 1000,
    min: Math.round(feature.properties.summary.duration / 60),
  };
}

interface Props {
  /** Where to route to. Null clears the route. `nonce` re-triggers the same destination. */
  destination: { pos: LatLng; nonce: number } | null;
  onStatus: (s: DirectionsStatus) => void;
  onInfo: (info: DualRoute | null) => void;
}

/**
 * Draws a route from the user's position to `destination`.
 *
 * Real road geometry from OpenRouteService when a key is configured; a straight
 * line with speed-estimated times otherwise, so the feature degrades instead of
 * disappearing. Reports status and distances back so the parent can render its
 * own badge.
 *
 * Previously duplicated line-for-line in the mosque and school finders.
 */
export function DirectionsLayer({ destination, onStatus, onInfo }: Props) {
  const map = useMap();
  const [user, setUser] = useState<LatLng | null>(null);
  const [carLine, setCarLine] = useState<LatLng[] | null>(null);
  const [footLine, setFootLine] = useState<LatLng[] | null>(null);

  // Held in refs so a parent that re-creates these callbacks each render doesn't
  // restart the geolocation + routing effect.
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const onInfoRef = useRef(onInfo);
  onInfoRef.current = onInfo;

  useEffect(() => {
    if (!destination) {
      setUser(null);
      setCarLine(null);
      setFootLine(null);
      onInfoRef.current(null);
      onStatusRef.current('idle');
      return;
    }

    const dest = destination.pos;
    let cancelled = false;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onStatusRef.current('error');
      return;
    }

    onStatusRef.current('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const origin: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setUser(origin);
        onStatusRef.current('routing');

        try {
          if (!ORS_KEY) throw new Error('no-key');
          const [car, foot] = await Promise.all([
            fetchRoute(origin, dest, 'driving-car'),
            fetchRoute(origin, dest, 'foot-walking'),
          ]);
          if (cancelled) return;

          setCarLine(car.coords);
          setFootLine(foot.coords);
          onInfoRef.current({
            car: { km: car.km, min: car.min },
            foot: { km: foot.km, min: foot.min },
          });
          map.fitBounds(L.latLngBounds([...car.coords, ...foot.coords]), { padding: [40, 40] });
          onStatusRef.current('idle');
        } catch {
          if (cancelled) return;
          // No key or the API failed: one straight line, times estimated from
          // typical speeds. Better than telling the user directions are broken.
          const km = haversineKm(origin, dest);
          const coords: LatLng[] = [origin, dest];
          setCarLine(coords);
          setFootLine(null);
          onInfoRef.current({
            car: { km, min: Math.round((km / DRIVING_KMH) * 60) },
            foot: { km, min: Math.round((km / WALKING_KMH) * 60) },
          });
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
          onStatusRef.current('idle');
        }
      },
      () => {
        if (!cancelled) onStatusRef.current('error');
      },
      GEOLOCATION_OPTIONS,
    );

    return () => {
      cancelled = true;
    };
  }, [destination, map]);

  return (
    <>
      {user && <Marker position={user} icon={userPin} />}
      {carLine && (
        <Polyline positions={carLine} pathOptions={{ color: MAP_COLORS.user, weight: 4, opacity: 0.85 }} />
      )}
      {footLine && (
        <Polyline
          positions={footLine}
          pathOptions={{ color: MAP_COLORS.walking, weight: 3, opacity: 0.9, dashArray: '6 8' }}
        />
      )}
    </>
  );
}
