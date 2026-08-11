'use client';

import { useCallback, useEffect, useState } from 'react';
import { GEOLOCATION_OPTIONS } from './constants';
import type { LatLng } from './geo';

export type LocateStatus = 'idle' | 'locating' | 'ready' | 'error';

interface Options {
  /**
   * Ask for the position as soon as the map mounts.
   *
   * True on the full finder pages, where highlighting the nearest place is the
   * point of the screen. False on the compact map, which offers a "Locate me"
   * button instead — a homepage section shouldn't trigger a browser permission
   * prompt the visitor didn't ask for.
   */
  auto?: boolean;
}

/**
 * The user's position, however the page chooses to ask for it.
 *
 * Replaces four hand-rolled `navigator.geolocation.getCurrentPosition` calls
 * that differed in whether they tracked a loading state, whether they surfaced
 * errors, and whether they ran on mount.
 */
export function useUserLocation({ auto = false }: Options = {}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocateStatus>('idle');

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setStatus('ready');
      },
      // Denied or unavailable is not exceptional: the map still works, it just
      // can't highlight what's nearest.
      () => {
        setPosition(null);
        setStatus('error');
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { position, status, locate, isLocating: status === 'locating' };
}
