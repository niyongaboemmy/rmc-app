'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Calendar, ArrowRight, Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { type Activity, badgeClass } from './data';

/* ──────────────────────────────────────────────────────────────
   Gallery lightbox — opens from a Latest Activity, shows the image
   plus a thumbnail gallery. Keyboard (Esc / ← / →), backdrop click,
   and body-scroll-lock included.
   ────────────────────────────────────────────────────────────── */
export function GalleryModal({
  activity,
  index,
  locale,
  onIndex,
  onClose,
}: {
  activity: Activity;
  index: number;
  locale: string;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const images = activity.gallery;
  const total = images.length;
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Keep the latest values for the once-subscribed key handler */
  const indexRef = useRef(index);
  indexRef.current = index;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  /* Keyboard nav — subscribe once (no focus stealing on navigation) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      else if (e.key === 'ArrowRight') onIndexRef.current((indexRef.current + 1) % total);
      else if (e.key === 'ArrowLeft') onIndexRef.current((indexRef.current - 1 + total) % total);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [total]);

  /* Lock background scroll WITHOUT shifting the page, and focus the close
     button WITHOUT scrolling — so the gallery opens right where you are. */
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, []);

  const go = (delta: number) => onIndex((index + delta + total) % total);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activity.title} — photo gallery`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      {/* Backdrop — click to dismiss */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog — capped to the viewport so it always fits the screen */}
      <div className="relative w-full max-w-3xl max-h-[92dvh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10">
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close gallery"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — full picture, letterboxed on green-deep, height-capped */}
        <div className="relative shrink-0 flex items-center justify-center bg-rmc-green-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt={`${activity.title} — image ${index + 1} of ${total}`}
            className="w-full max-h-[58vh] object-contain"
          />

          {total > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[11px] font-semibold tabular-nums backdrop-blur-sm">
                {index + 1} / {total}
              </div>
            </>
          )}
        </div>

        {/* Caption + thumbnails — scrolls only if the screen is very short */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={badgeClass(activity.tone)}>{activity.category}</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Calendar className="w-3 h-3 shrink-0" />
              {activity.date}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1.5">{activity.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{activity.excerpt}</p>

          {total > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => onIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 ring-2 transition-all outline-none focus-visible:ring-rmc-green ${
                    i === index ? 'ring-rmc-green' : 'ring-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Footer — photo count + read-more CTA */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              <Images className="w-3.5 h-3.5 shrink-0" />
              {total} {total === 1 ? 'photo' : 'photos'}
            </span>
            <Link
              href={`/${locale}/activities`}
              className="group inline-flex items-center gap-1.5 px-4 py-2 shrink-0 bg-rmc-green text-white text-xs font-bold rounded-full shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 motion-safe:hover:scale-105 transition-all duration-300"
            >
              Read full story
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
