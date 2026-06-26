'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];

const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="26" height="38" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="#0d3d24"/>
    <circle cx="12" cy="12" r="4.6" fill="#fff"/>
  </svg>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FlyToCenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 0.8 });
  }, [center, map]);
  return null;
}

interface Props {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  flyToCenter?: [number, number] | null;
}

export default function LocationPicker({ lat, lng, onPick, flyToCenter }: Props) {
  const hasPosition = lat != null && lng != null;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={hasPosition ? [lat as number, lng as number] : RWANDA_CENTER}
        zoom={hasPosition ? 14 : 8}
        scrollWheelZoom
        zoomControl
        className="w-full h-full"
        style={{ background: '#eef2ee' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <FlyToCenter center={flyToCenter ?? null} />
        {hasPosition && (
          <Marker position={[lat as number, lng as number]} icon={pinIcon} />
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm text-[11px] text-gray-500 px-2 py-1 rounded-lg shadow pointer-events-none">
        Click on the map to set coordinates
      </div>
    </div>
  );
}
