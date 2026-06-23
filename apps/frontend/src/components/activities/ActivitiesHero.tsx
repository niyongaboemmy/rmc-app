'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

/* Real RMC community event photos — quiet auto-crossfade background */
const SLIDES = [
  'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
  'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
];

export function ActivitiesHero() {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  /* Gentle auto-advance (paused for reduced-motion users) */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const id = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % SLIDES.length);
        setTransitioning(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-[50vh] items-center overflow-hidden bg-rmc-green-deep">
      {/* ── Background image layer (crossfade) ── */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === current && !transitioning ? 1 : 0 }}
        >
          <Image src={src} alt="" fill priority={i === 0} className="object-cover object-center" sizes="100vw" />
        </div>
      ))}

      {/* ── Overlays — keep centered text readable ── */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Content — centered, no verse ticker, no buttons ── */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-36 pb-14 text-center sm:px-6 lg:px-8">
        <div className="animate-fade-up">
          {/* Arabic blessing — matches the home hero greeting's size & style */}
          <p className="mb-3 font-arabic text-lg leading-loose text-rmc-gold-light drop-shadow md:text-xl" dir="rtl">
            بِسْمِ اللَّهِ
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-4xl">
            Latest &amp; Upcoming
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            Follow RMC&apos;s most recent activities and mark your calendar for the community events ahead.
          </p>
        </div>
      </div>
    </section>
  );
}
