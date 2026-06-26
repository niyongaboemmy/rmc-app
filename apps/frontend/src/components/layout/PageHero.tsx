'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared page header — quiet auto-crossfade of RMC community photos behind a
 * darkening overlay, mirroring the Activities hero. Used across Gallery, Blog
 * and Contact so every secondary page shares the same height, background
 * animation, and heading / text styles.
 */

/* Real RMC community event photos — the background crossfade reel. */
const DEFAULT_SLIDES = [
  'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
  'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
  'https://drive.google.com/thumbnail?id=1dNjgzd30RyYQ0_zCLFoqj83HjGh03bwq&sz=w1600',
];

interface PageHeroProps {
  /** Small uppercase pill above the title. */
  eyebrow?: string;
  /** Main heading. */
  title: string;
  /** Override the heading's responsive font-size classes (defaults to the large hero size). */
  titleClassName?: string;
  /** Supporting line under the title. */
  subtitle?: string;
  /** Optional "back" pill (detail pages). */
  backHref?: string;
  backLabel?: string;
  /** Override the background crossfade images. */
  images?: string[];
  /** Heading alignment. Detail/article pages read better left-aligned. */
  align?: 'center' | 'left';
  /** Show the gold ornament divider under the title (centered heroes). */
  ornament?: boolean;
  /** Override the section's min-height (defaults to the tall hero size). */
  minHeightClassName?: string;
  /** Override the content vertical padding (defaults to the tall hero spacing). */
  paddingClassName?: string;
  /** Extra content rendered below the subtitle (e.g. article metadata). */
  children?: ReactNode;
}

export function PageHero({
  eyebrow,
  title,
  titleClassName = 'text-3xl md:text-4xl lg:text-5xl',
  subtitle,
  backHref,
  backLabel,
  images = DEFAULT_SLIDES,
  align = 'center',
  ornament = false,
  minHeightClassName = 'min-h-[50vh]',
  paddingClassName = 'pt-36 pb-14',
  children,
}: PageHeroProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  /* Gentle auto-advance (paused for reduced-motion users). */
  useEffect(() => {
    if (
      images.length < 2 ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }
    const id = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % images.length);
        setTransitioning(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, [images.length]);

  const centered = align === 'center';

  return (
    <section className={`relative flex ${minHeightClassName} items-center overflow-hidden bg-rmc-green-deep`}>
      {/* ── Background image layer (crossfade) ── */}
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === current && !transitioning ? 1 : 0 }}
        >
          <Image src={src} alt="" fill priority={i === 0} className="object-cover object-center" sizes="100vw" />
        </div>
      ))}

      {/* ── Overlays — keep the text readable ── */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Content ── */}
      <div className={`relative z-10 mx-auto w-full max-w-7xl px-4 ${paddingClassName} sm:px-6 lg:px-8`}>
        <div className="animate-fade-up">
          {backHref && (
            <Link
              href={backHref}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-rmc-gold/50 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}

          <div className={centered ? 'text-center mx-auto max-w-3xl' : 'text-left max-w-2xl'}>
            {eyebrow && (
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
                {eyebrow}
              </div>
            )}

            <h1 className={`font-bold leading-tight text-white drop-shadow-lg ${titleClassName}`}>
              {title}
            </h1>

            {ornament && (
              <div className="ornament-divider mx-auto my-4 max-w-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
              </div>
            )}

            {subtitle && (
              <p
                className={`mt-4 text-sm leading-relaxed text-white/75 md:text-base ${
                  centered ? 'mx-auto max-w-xl' : 'max-w-2xl'
                }`}
              >
                {subtitle}
              </p>
            )}

            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
