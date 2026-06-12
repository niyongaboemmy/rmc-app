'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselImage {
  src: string;
  alt: string;
}

interface Props {
  images: CarouselImage[];
  /** autoplay interval in ms */
  interval?: number;
}

export function ImageCarousel3D({ images, interval = 5000 }: Props) {
  const len = images.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => setCurrent(((i % len) + len) % len), [len]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + len) % len), [len]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % len), [len]);

  // Shared glass-arrow style — mirrors the home page carousel
  const arrowClass =
    'grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/15 hover:border-white/40 hover:scale-105 active:scale-100 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rmc-green-deep';

  // Autoplay — pauses on hover / focus
  useEffect(() => {
    if (paused || len <= 1) return;
    const id = window.setInterval(() => {
      setCurrent((c) => (c + 1) % len);
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, interval, len]);

  return (
    <div
      className="absolute inset-0 [perspective:1400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Blurred backdrop — current image scaled up + blurred to fill the frame */}
      {images.map((img, i) => (
        <div
          key={`bg-${img.src}`}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === current ? 1 : 0 }}
          aria-hidden
        >
          <Image
            src={img.src}
            alt=""
            fill
            sizes="50vw"
            className="object-cover scale-125 blur-2xl opacity-60"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-rmc-green-deep/15" />

      {/* 3D coverflow stage */}
      <div className="absolute inset-0 [transform-style:preserve-3d]">
        {images.map((img, i) => {
          // shortest signed distance from the active slide (with wrap-around)
          let offset = i - current;
          if (offset > len / 2) offset -= len;
          if (offset < -len / 2) offset += len;
          const abs = Math.abs(offset);
          const visible = abs <= 2;

          const transform = [
            'translate(-50%, -50%)',
            `translateX(${offset * 50}%)`,
            `translateZ(${-abs * 220}px)`,
            `rotateY(${offset * -38}deg)`,
            `scale(${1 - abs * 0.06})`,
          ].join(' ');

          return (
            <button
              key={img.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${len}`}
              aria-current={i === current}
              tabIndex={i === current ? 0 : -1}
              className="absolute top-1/2 left-1/2 w-[74%] h-[84%] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold"
              style={{
                transform,
                opacity: visible ? 1 : 0,
                zIndex: 100 - abs,
                pointerEvents: visible ? 'auto' : 'none',
                cursor: offset === 0 ? 'default' : 'pointer',
              }}
            >
              <Image
                src={img.src}
                alt={i === current ? img.alt : ''}
                fill
                priority={i === 0}
                sizes="50vw"
                className="object-cover object-center"
              />
              {/* Dim non-active slides for depth */}
              <span
                className="absolute inset-0 bg-rmc-green-deep transition-opacity duration-700"
                style={{ opacity: offset === 0 ? 0 : Math.min(0.55, 0.3 + abs * 0.15) }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Prev / Next glass arrows — mirrors the home page carousel */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous image"
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-[200] ${arrowClass}`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next image"
        className={`absolute right-3 top-1/2 -translate-y-1/2 z-[200] ${arrowClass}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2">
        {images.map((img, i) => (
          <button
            key={`dot-${img.src}`}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to image ${i + 1} of ${len}`}
            aria-current={i === current}
            className="grid place-items-center w-6 h-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold rounded-full"
          >
            <span
              className={`block rounded-full transition-all duration-500 ${
                i === current ? 'bg-rmc-gold w-6 h-1.5' : 'bg-white/70 hover:bg-white w-1.5 h-1.5'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
