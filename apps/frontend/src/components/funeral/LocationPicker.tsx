'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

/* Green teardrop pin (same divIcon as the cemetery directory map). */
const pinIcon = L.divIcon({
  className: 'rmc-cemetery-pin',
  html: `<svg width="26" height="38" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#0d3d24"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
});

/** Report map clicks as a picked coordinate. */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Recentre the map when the selected coordinate changes from outside. */
function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 13));
  }, [lat, lng, map]);
  return null;
}

/** Ensure tiles lay out correctly when mounted inside a modal. */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const hasPos = lat != null && lng != null;
  const center: [number, number] = hasPos ? [lat, lng] : RWANDA_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={hasPos ? 13 : 8}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: '#eef2ee' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSize />
      <ClickHandler onPick={onChange} />
      <Recenter lat={lat} lng={lng} />
      {hasPos && (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
