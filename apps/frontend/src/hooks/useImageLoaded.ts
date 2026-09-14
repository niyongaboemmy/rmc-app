'use client';

import { useCallback, useState } from 'react';

/**
 * Whether the photo at `src` has arrived, so a placeholder can be shown until it
 * has. Returns props to spread onto an `<img>` (or a `next/image`).
 *
 * ── Why this tracks a src rather than a boolean ──────────────────────────────
 *
 * The lightbox pages through photos on one `<img>` element. With a boolean, the
 * first photo sets `loaded` and it never goes back — so every later photo would
 * be waited for behind a stale picture with no placeholder at all, which is the
 * exact case a reader on a slow connection notices most. Comparing the src that
 * finished against the src being asked for resets it for free, with no effect to
 * mistime.
 *
 * ── The cached-image race ────────────────────────────────────────────────────
 *
 * An image the browser already holds can finish before React attaches `onLoad`,
 * and then the event never fires and the placeholder pulses forever. `complete`
 * is the only way to notice after the fact, so it is read in a callback ref,
 * which runs at attach time.
 *
 * `next/image` already does this internally (it checks `img.complete` in its own
 * ref and synthesises the load event), so there the ref is belt-and-braces. The
 * lightbox and the edit board use a plain `<img>`, which does not — and one hook
 * both can use beats two mechanisms for one job.
 *
 * ── Errors settle it too ─────────────────────────────────────────────────────
 *
 * A photo that 404s would otherwise pulse for as long as the page is open,
 * promising something that is never coming. Whatever is underneath — an alt
 * text, a broken-image icon — is more honest than a placeholder that lies.
 */
export function useImageLoaded(src: string | null | undefined) {
  const [settledSrc, setSettledSrc] = useState<string | null>(null);

  const settle = useCallback(() => setSettledSrc(src ?? null), [src]);

  const ref = useCallback(
    (node: HTMLImageElement | null) => {
      // `complete` is also true for an image that failed, which is the same
      // answer for our purposes: stop showing the placeholder either way.
      if (node?.complete) setSettledSrc(src ?? null);
    },
    [src],
  );

  return {
    /** True once the photo currently being asked for has arrived (or failed). */
    loaded: src != null && settledSrc === src,
    /** Spread onto the image element. */
    imageProps: { ref, onLoad: settle, onError: settle },
  };
}
