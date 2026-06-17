'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface PileImage {
  src: string;
  alt?: string;
}

interface Props {
  images: PileImage[];
  /** Opens the lightbox at the given image index when the pile is clicked. */
  onOpen?: (index: number) => void;
  /** Label for the "view all" trigger (defaults to "View all"). */
  viewAllLabel?: string;
}

/**
 * A "pile" of photos stacked in 3D — the front photo is in focus while the
 * rest fan out behind it with rotation, offset and scale. Clicking it opens
 * the gallery lightbox at the currently focused photo.
 */
export function PileCarousel({ images, onOpen, viewAllLabel = 'View all' }: Props) {
  const n = images.length;
  const [current] = useState(0);

  const activate = useCallback(() => {
    onOpen?.(current);
  }, [onOpen, current]);

  if (n === 0) return null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        role="button"
        tabIndex={0}
        aria-label={viewAllLabel}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
          }
        }}
        className="group relative mx-auto w-full max-w-md aspect-[4/3] cursor-pointer select-none [perspective:1200px] focus-visible:outline-none"
      >
        {images.map((img, i) => {
          const depth = (i - current + n) % n; // 0 = front of the pile
          const visible = depth < 4;
          const rot = depth === 0 ? 0 : (depth % 2 === 0 ? 1 : -1) * (3 + depth * 2.5);
          const tx = depth * 9;
          const ty = depth * 5;
          const scale = 1 - depth * 0.05;
          return (
            <div
              key={`${img.src}-${i}`}
              aria-hidden={depth !== 0}
              className="absolute inset-0 rounded-2xl bg-white p-2.5 shadow-[0_20px_45px_-18px_rgba(13,61,36,0.5)] ring-1 ring-black/5 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform"
              style={{
                transform: `translateX(${tx}px) translateY(${ty}px) rotateY(${depth * -4}deg) rotate(${rot}deg) scale(${scale})`,
                zIndex: n - depth,
                opacity: visible ? 1 : 0,
                pointerEvents: depth === 0 ? 'auto' : 'none',
              }}
            >
              <div className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src={img.src}
                  alt={depth === 0 ? img.alt ?? '' : ''}
                  fill
                  sizes="(max-width: 768px) 90vw, 28rem"
                  className="object-cover object-center"
                />
                {/* Focused photo: sheen + "view all" hint on hover */}
                {depth === 0 && (
                  <>
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/40 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-2 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-green opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {viewAllLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — photo count + explicit "View all" trigger */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium tabular-nums text-gray-400">
          <span className="font-bold text-rmc-green">{n}</span>
          <span>{n === 1 ? 'photo' : 'photos'}</span>
        </div>
        <span className="h-3 w-px bg-gray-300" />
        <button
          type="button"
          onClick={() => onOpen?.(0)}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-green transition-colors hover:text-rmc-green-dark"
        >
          {viewAllLabel}
        </button>
      </div>
    </div>
  );
}
