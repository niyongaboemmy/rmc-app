'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Compass } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

/** The classic 8-pointed Islamic star — two overlaid squares (outline). */
function EightPointStar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="none" aria-hidden="true">
      <rect x="24" y="24" width="52" height="52" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <rect
        x="24"
        y="24"
        width="52"
        height="52"
        rx="6"
        transform="rotate(45 50 50)"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

/** Layered, counter-rotating geometric medallion — the hero centerpiece. */
function StarMedallion({ className, reduced }: { className?: string; reduced: boolean }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
      {/* Soft gold halo */}
      <span className="absolute inset-0 rounded-full bg-rmc-gold/20 blur-2xl animate-pulse-glow motion-reduce:animate-none" />
      {/* Outer ring — slow clockwise (green) */}
      <EightPointStar className="absolute inset-0 h-full w-full text-rmc-green animate-spin-slow motion-reduce:animate-none" />
      {/* Middle ring — slow counter-clockwise (gold; inline anim, so gate it in JS) */}
      <EightPointStar
        className="absolute inset-[17%] text-rmc-gold"
        style={reduced ? undefined : { animation: 'spin 30s linear infinite reverse' }}
      />
      {/* Inner filled star + light core */}
      <svg
        viewBox="0 0 100 100"
        className="relative h-[40%] w-[40%] text-rmc-green-deep drop-shadow-[0_2px_6px_rgba(13,61,36,0.25)]"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="30" y="30" width="40" height="40" rx="4" />
        <rect x="30" y="30" width="40" height="40" rx="4" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="6.5" fill="#D4A017" />
      </svg>
    </span>
  );
}

/**
 * Mosque skyline silhouette — onion domes, arched minarets and gold crescent
 * finials. Sits along the bottom of the hero as a grounded horizon.
 */
function MosqueSkyline({ className }: { className?: string }) {
  const gold = '#D4A017';
  return (
    <svg
      viewBox="0 0 1200 240"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* ground */}
      <rect x="0" y="176" width="1200" height="64" />

      {/* far small domes */}
      <path d="M96 176 C96 138 120 120 150 120 C180 120 204 138 204 176 Z" />
      <path d="M1000 176 C1000 140 1022 124 1050 124 C1078 124 1100 140 1100 176 Z" />

      {/* medium domes */}
      <path d="M250 176 C250 120 296 86 330 86 C364 86 410 120 410 176 Z" />
      <path d="M790 176 C790 120 836 86 870 86 C904 86 950 120 950 176 Z" />

      {/* flanking minarets */}
      <g>
        <rect x="470" y="92" width="16" height="84" />
        <path d="M462 92 C462 74 470 62 478 60 C486 62 494 74 494 92 Z" />
        <path d="M471 60c0-6 5-10 10-9-3 1-5 3-5 6s2 5 5 6c-5 1-10-3-10-3z" fill={gold} />
        <rect x="714" y="92" width="16" height="84" />
        <path d="M706 92 C706 74 714 62 722 60 C730 62 738 74 738 92 Z" />
        <path d="M715 60c0-6 5-10 10-9-3 1-5 3-5 6s2 5 5 6c-5 1-10-3-10-3z" fill={gold} />
      </g>

      {/* central grand onion dome */}
      <path d="M524 176 C524 104 556 54 600 44 C644 54 676 104 676 176 Z" />
      <rect x="596" y="28" width="8" height="20" />
      <path d="M600 8c-9 2-15 10-15 19s6 17 15 19c-5-4-8-11-8-19s3-15 8-19z" fill={gold} />
    </svg>
  );
}

export function NotFoundView() {
  const t = useTranslations('notFoundPage');
  const { locale } = useParams<{ locale: string }>();
  const loc = locale ?? 'en';

  // Subtle mouse parallax — disabled entirely under prefers-reduced-motion.
  const [reduced, setReduced] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPref = () => setReduced(mq.matches);
    applyPref();
    mq.addEventListener('change', applyPref);

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (mq.matches) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setOffset({
          x: e.clientX / window.innerWidth - 0.5,
          y: e.clientY / window.innerHeight - 0.5,
        }),
      );
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      mq.removeEventListener('change', applyPref);
    };
  }, []);

  const layer = (depth: number): React.CSSProperties =>
    reduced ? {} : { transform: `translate3d(${offset.x * depth}px, ${offset.y * depth}px, 0)` };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* No opaque background — the app's default #f4f5f2 crosshatch shows through.
          pt-36 clears the fixed Navbar so content never sits underneath it. */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-28 pt-36 text-center">
        {/* Soft brand glows for depth (transparent) */}
        <div className="pointer-events-none absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-rmc-green/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 right-[-4rem] h-[26rem] w-[26rem] rounded-full bg-rmc-gold/10 blur-3xl" aria-hidden="true" />

        {/* Floating geometric ornaments */}
        <EightPointStar
          className="pointer-events-none absolute left-[8%] top-32 h-14 w-14 text-rmc-green/10 animate-float-slow motion-reduce:animate-none"
          style={layer(22)}
        />
        <EightPointStar
          className="pointer-events-none absolute right-[9%] top-40 h-20 w-20 text-rmc-gold/20 animate-float motion-reduce:animate-none"
          style={layer(30)}
        />
        <EightPointStar
          className="pointer-events-none absolute bottom-[30%] left-[14%] h-10 w-10 text-rmc-green/10 animate-float motion-reduce:animate-none"
          style={layer(16)}
        />

        {/* Mosque skyline — grounded horizon (static) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
          <MosqueSkyline className="h-auto w-full text-rmc-green-deep opacity-90" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-rmc-gold/40 bg-rmc-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rmc-green-deep backdrop-blur-sm animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold animate-pulse motion-reduce:animate-none" />
            {t('eyebrow')}
          </p>

          {/* 4 · medallion · 4 (with gentle counter-parallax) */}
          <div style={layer(-12)}>
            <div className="mb-7 flex items-center justify-center gap-2 animate-fade-up sm:gap-6">
              <span className="bg-gradient-to-b from-rmc-green to-rmc-green-deep bg-clip-text text-7xl font-extrabold leading-none tracking-tight text-transparent sm:text-9xl">
                4
              </span>
              <StarMedallion className="h-24 w-24 sm:h-36 sm:w-36" reduced={reduced} />
              <span className="bg-gradient-to-b from-rmc-green to-rmc-green-deep bg-clip-text text-7xl font-extrabold leading-none tracking-tight text-transparent sm:text-9xl">
                4
              </span>
            </div>
          </div>

          {/* Gold divider */}
          <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-rmc-gold/70 to-transparent animate-fade-in" />

          <h1
            className="mb-3 text-2xl font-bold text-rmc-green-deep animate-fade-up sm:text-3xl"
            style={{ animationDelay: '80ms' }}
          >
            {t('title')}
          </h1>
          <p
            className="mx-auto mb-9 max-w-md text-sm leading-relaxed text-gray-600 animate-fade-up sm:text-base"
            style={{ animationDelay: '160ms' }}
          >
            {t('subtitle')}
          </p>

          <div
            className="flex flex-col justify-center gap-3 animate-fade-up sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href={`/${loc}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/20 transition-all duration-200 hover:scale-105 hover:bg-rmc-green-dark hover:shadow-xl active:scale-100"
            >
              <Home className="h-4 w-4" /> {t('home')}
            </Link>
            <Link
              href={`/${loc}/services`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rmc-green/30 bg-white/60 px-6 py-3 text-sm font-semibold text-rmc-green-deep backdrop-blur-sm transition-all duration-200 hover:border-rmc-green/60 hover:bg-white"
            >
              <Compass className="h-4 w-4" /> {t('services')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
