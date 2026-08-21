'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Cemetery } from './types';
import 'leaflet/dist/leaflet.css';

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

/* Green teardrop pin as a divIcon — Leaflet's default PNG markers don't resolve
   through the bundler, so we inline an SVG (same approach as the mosque map). */
const pinIcon = L.divIcon({
  className: 'rmc-cemetery-pin',
  html: `<svg width="26" height="38" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#0d3d24"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
  popupAnchor: [0, -34],
});

function located(cemeteries: Cemetery[]): (Cemetery & { lat: number; lng: number })[] {
  return cemeteries.filter((c): c is Cemetery & { lat: number; lng: number } => c.lat != null && c.lng != null);
}

/** Fit the map to all cemetery markers once. */
function FitToAll({ cemeteries }: { cemeteries: (Cemetery & { lat: number; lng: number })[] }) {
  const map = useMap();
  useEffect(() => {
    if (cemeteries.length === 0) return;
    const bounds = L.latLngBounds(cemeteries.map((c) => [c.lat, c.lng] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [cemeteries, map]);
  return null;
}

/** Fly to a focused cemetery when the card "Locate" button is pressed. */
function FlyTo({ focus }: { focus: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 14, { duration: 0.8 });
  }, [focus, map]);
  return null;
}

export default function CemeteryMap({
  cemeteries,
  focus,
  directionsLabel,
}: {
  cemeteries: Cemetery[];
  focus: { lat: number; lng: number; nonce: number } | null;
  directionsLabel: string;
}) {
  const pins = located(cemeteries);

  return (
    <MapContainer
      center={RWANDA_CENTER}
      zoom={8}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ background: '#eef2ee' }}
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToAll cemeteries={pins} />
      <FlyTo focus={focus} />
      {pins.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={pinIcon}>
          <Popup>
            <span className="block font-semibold text-gray-900">{c.name}</span>
            <span className="mt-0.5 block text-xs text-gray-500">{c.address}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs font-medium text-rmc-green hover:underline"
            >
              {directionsLabel}
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
