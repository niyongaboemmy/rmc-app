'use client';

import type { ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import {
  MAP_BACKGROUND,
  RWANDA_CENTER,
  RWANDA_ZOOM,
  TILE_ATTRIBUTION,
  TILE_URL,
} from './constants';
import type { LatLng } from './geo';
import 'leaflet/dist/leaflet.css';

interface Props {
  center?: LatLng;
  zoom?: number;
  /**
   * Scroll-wheel zoom. On for full-height finder maps, where the map is the
   * screen; off for a map embedded mid-page, so scrolling past it doesn't trap
   * the reader's wheel.
   */
  scrollWheelZoom?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * The map shell every RMC map is built on: OSM tiles, the same attribution,
 * zoom control top-right, and the tile-loading background colour.
 *
 * Exists so a change to the tile provider or attribution is one edit rather than
 * six, and so no map can quietly ship with a different basemap than the others.
 */
export function RwandaMap({
  center = RWANDA_CENTER,
  zoom = RWANDA_ZOOM,
  scrollWheelZoom = true,
  className = 'h-full w-full',
  children,
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={false}
      className={className}
      style={{ background: MAP_BACKGROUND }}
    >
      <ZoomControl position="topright" />
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      {children}
    </MapContainer>
  );
}
