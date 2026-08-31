'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Raises the browser's print dialog when the entry was opened with `?print=1`.
 *
 * That is what the listing's "Download" links to. Printing is the download: the
 * browser's own dialog offers "Save as PDF", uses the fonts already loaded, and
 * shapes Arabic correctly — which a server-side generator could not do here,
 * since pdf-lib has no text shaping and the library that would add it cannot be
 * installed offline.
 *
 * A frame is waited for first. `window.print()` blocks the main thread until the
 * dialog closes, so calling it during the same paint that mounts the page shows
 * the dialog over a half-rendered document, and that half-rendered state is what
 * gets printed. One rAF is enough to let the answer land.
 *
 * Fires once per navigation, deliberately: `?print=1` survives in the URL, so
 * re-running on every render would reopen the dialog the moment the reader
 * dismissed it.
 */
export function PrintOnLoad() {
  const searchParams = useSearchParams();
  const wanted = searchParams.get('print') === '1';

  useEffect(() => {
    if (!wanted) return;
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [wanted]);

  return null;
}
