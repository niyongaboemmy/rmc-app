'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';

export type GalleryGroup = {
  key: string;
  label: string;
  images: string[];
};

/* ──────────────────────────────────────────────────────────────
   Month-grouped uniform photo grid with a click-to-open lightbox.
   The lightbox navigates across every photo in the category
   (keyboard ← / → / Esc, backdrop click, body-scroll-lock).
   ────────────────────────────────────────────────────────────── */
export function CategoryGalleryGrid({
  groups,
  label,
}: {
  groups: GalleryGroup[];
  label: string;
}) {
  /* Flatten every photo into one list so the lightbox can page through
     the whole category, not just a single month. */
  const flat = groups.flatMap((g) =>
    g.images.map((src) => ({ src, period: g.label })),
  );
  const total = flat.length;

  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
  );

  /* Keyboard nav + body-scroll-lock while the lightbox is open. */
  const goRef = useRef(go);
  goRef.current = go;
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (open === null) return;

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
  }, [open]);

  /* Running offset so each tile knows its index within the flat list. */
  let offset = 0;

  return (
    <>
      {groups.map((group, gi) => {
        const start = offset;
        offset += group.images.length;
        const tinted = gi % 2 === 1;
        return (
          <section
            key={group.key}
            className={`py-12 md:py-14 px-4 ${tinted ? 'bg-rmc-green/[0.03] border-y border-rmc-green/10' : 'bg-transparent'}`}
          >
            <div className="max-w-7xl mx-auto">
              {/* Month sub-header */}
              <div className="flex items-center gap-4 mb-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-rmc-green/15 bg-rmc-green-light/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-green-dark">
                  <CalendarDays className="w-3.5 h-3.5 text-rmc-gold" />
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-rmc-green/25 via-rmc-gold/25 to-transparent" />
              </div>

              {/* Uniform grid — every tile is the same square */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {group.images.map((src, i) => {
                  const globalIndex = start + i;
                  return (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => setOpen(globalIndex)}
                      aria-label={`View photo ${i + 1} — ${label}, ${group.label}`}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-gray-200/70 bg-gray-100 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2"
                    >
                      <Image
                        src={src}
                        alt={`${label} — ${group.label}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover object-center transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {open !== null && (
        <Lightbox
          src={flat[open].src}
          caption={`${label} — ${flat[open].period}`}
          index={open}
          total={total}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onClose={close}
        />
      )}
    </>
  );
}

function Lightbox({
  src,
  caption,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  src: string;
  caption: string;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      {/* Backdrop — click to dismiss */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -top-12 right-0 z-20 w-9 h-9 rounded-full bg-white/10 text-white backdrop-blur-sm flex items-center justify-center hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — full picture, letterboxed, height-capped */}
        <div className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption}
            className="max-h-[82dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
          />

          {total > 1 && (
            <>
              <button
                onClick={onPrev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNext}
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
          <span className="text-sm font-medium text-white/85">{caption}</span>
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
