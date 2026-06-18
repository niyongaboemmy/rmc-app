'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt?: string;
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

  if (typeof document === 'undefined' || total === 0) return null;

  const current = images[index];
  const caption = current.alt ?? '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Photo preview'}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
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
          className="relative flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={caption}
            className="max-h-[82dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 select-none"
            draggable={false}
          />

          {total > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
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
