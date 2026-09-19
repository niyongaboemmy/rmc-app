'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageLoaded } from '@/hooks/useImageLoaded';
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder';

export interface LightboxImage {
  src: string;
  alt?: string;
  /** Largest stored file; swapped in once it has arrived, over `src`. */
  full?: string;
}

/* ──────────────────────────────────────────────────────────────
   Full-screen photo lightbox. Pages through `images` starting at
   `startIndex`, with on-screen nav icons, keyboard (← / → / Esc),
   touch swipe, backdrop-click dismiss and body-scroll-lock.
   ────────────────────────────────────────────────────────────── */
export function GalleryLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const total = images.length;
  const [index, setIndex] = useState(startIndex);

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total],
  );

  /* Keyboard nav + body-scroll-lock while open. */
  const goRef = useRef(go);
  goRef.current = go;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      else if (e.key === 'ArrowRight') goRef.current(1);
      else if (e.key === 'ArrowLeft') goRef.current(-1);
    };
    document.addEventListener('keydown', onKey);

    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, []);

  /* Touch swipe — horizontal drag past a threshold pages the photo. */
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  /* Placeholder while the photo arrives. Called before the early return below,
     since it is a hook — hence the optional index rather than `current.src`.

     Usually instant: the lightbox opens the same medium-sized file the pile
     behind it already loaded, so the browser has it and `complete` settles this
     on the first ref. It earns its place on the cold paths — a photo the pile
     had not reached yet, and every step through the set with the arrows, where
     the next file has not been asked for until now. */
  const { loaded, imageProps } = useImageLoaded(images[index]?.src);

  /* Progressive upgrade. The dialog opens on the medium file, which the pile
     behind it already fetched, so there is a picture at once. The largest
     stored file is then requested off-screen and swapped in when it has fully
     arrived — never before, so the reader sees a sharper photo replace a soft
     one and not a blank frame waiting on a 300KB download. */
  // Keyed by index rather than reset in the effect: state reset happens after
  // paint, so a bare URL would put the previous photo's full-size file on the
  // <img> for the first frame after a page turn.
  const [hiRes, setHiRes] = useState<{ index: number; url: string } | null>(null);
  useEffect(() => {
    const target = images[index];
    const full = target?.full;
    if (!full || full === target.src) return;
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setHiRes({ index, url: full });
    };
    probe.src = full;
    return () => {
      cancelled = true;
    };
  }, [images, index]);

  if (typeof document === 'undefined' || total === 0) return null;

  const current = images[index];
  const caption = current.alt ?? '';
  const shownSrc = hiRes?.index === index ? hiRes.url : current.src;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Photo preview'}
      // touch-none: iOS Safari ignores overflow:hidden on <body> for touch
      // scrolling, so without it a swipe on the photo also scrolls the page
      // underneath. The lightbox handles its own swipes, and has nothing that
      // needs to scroll, so the browser gets none of the gestures.
      className="fixed inset-0 z-[100] flex touch-none items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      {/* Backdrop — click to dismiss */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-12 sm:mt-14 w-full max-w-4xl">
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -top-9 right-0 z-20 w-9 h-9 rounded-full bg-white/10 text-white backdrop-blur-sm flex items-center justify-center hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — full picture, letterboxed, height-capped */}
        <div
          // The height floor holds the frame open while the photo is on its way.
          // Without it the img has no box yet, so the dialog would collapse to
          // its caption and then shove it down — the jump a placeholder exists
          // to prevent. Dropped the moment the photo can size the frame itself.
          className={`relative flex items-center justify-center ${loaded ? '' : 'min-h-[55dvh]'}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center">
              {/* Held to a plausible landscape frame rather than stretched over
                  the full dialog width, so the swap to the real photo is a small
                  correction instead of a wide grey slab collapsing to a portrait. */}
              <div className="relative aspect-[3/2] max-h-full w-full max-w-2xl overflow-hidden rounded-2xl">
                <PhotoPlaceholder tone="dark" icon />
              </div>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            {...imageProps}
            src={shownSrc}
            alt={caption}
            // Lifted above the placeholder, which is absolute and would otherwise
            // paint over this in-flow image. So the photo is never hidden waiting
            // for a signal: if `loaded` somehow never arrives, the reader still
            // sees the photo, with a pulse behind it rather than instead of it.
            // 82dvh on a tall screen; on a short one (a phone held sideways
            // is 390px) the budget is the viewport minus the top margin, the
            // caption row and the padding, or the caption ends up off-screen.
            className="relative z-10 max-h-[min(82dvh,calc(100dvh_-_7.5rem))] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 select-none"
            draggable={false}
          />

          {total > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous photo"
                // z-20: the photo is lifted to z-10 above its placeholder, and
                // without this the arrows sat under it wherever the photo
                // reached the frame's edge — which is always, on a phone.
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Caption + counter */}
        <div className="mt-4 flex items-center justify-center gap-3 text-white">
          {caption && <span className="text-sm font-medium text-white/85">{caption}</span>}
          {total > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold tabular-nums backdrop-blur-sm">
              {index + 1} / {total}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
