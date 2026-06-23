'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import {
  ContentKeys,
  HERO_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  type HeroContent,
} from '@/lib/content-api';

function SlideIndicators({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          role="tab"
          aria-selected={i === current}
          className={`transition-all duration-500 rounded-full motion-reduce:transition-none ${
            i === current ? 'bg-rmc-gold w-7 h-2' : 'bg-white/40 hover:bg-white/60 w-2 h-2'
          }`}
          aria-label={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* Floating particle */
function Particle({
  top,
  left,
  dur,
  delay,
  size = 4,
}: {
  top: string;
  left: string;
  dur: string;
  delay: string;
  size?: number;
}) {
  return (
    <div
      className="particle absolute rounded-full bg-rmc-gold/30 pointer-events-none motion-reduce:hidden"
      style={
        {
          top,
          left,
          width: size,
          height: size,
          '--dur': dur,
          '--delay': delay,
        } as React.CSSProperties
      }
    />
  );
}

export function HeroSection() {
  const { locale } = useParams<{ locale: string }>();
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Content managed from Admin → Content → Hero. Falls back to the built-in
  // defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<HeroContent>(HERO_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<HeroContent>(ContentKeys.hero)
      .then((data) => {
        if (active && data) setContent(mergeContent(HERO_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const slides = content.slides;
  const slideCount = slides.length;

  /* Split the headline so the lead ("Welcome to the") reads in white and the
     brand name (the last words) reads in gold — two distinct colours. */
  const headlineWords = pick(content.headline, locale).trim().split(/\s+/);
  const accentCount = Math.min(3, Math.max(1, headlineWords.length - 1));
  const headlineLead = headlineWords.slice(0, headlineWords.length - accentCount).join(' ');
  const headlineAccent = headlineWords.slice(headlineWords.length - accentCount).join(' ');

  /* Auto-advance slideshow (paused for reduced-motion users) */
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    if (slideCount <= 1) return;
    const id = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % slideCount);
        setTransitioning(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, [slideCount]);

  const goTo = (i: number) => {
    if (i === current) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(i);
      setTransitioning(false);
    }, 600);
  };

  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-rmc-green-deep">
      {/* ── Background image layer (crossfade) ── */}
      {slides.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === current && !transitioning ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* ── Dark backdrop for the right-aligned copy; the photo stays visible on the left ── */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

      {/* ── Subtle Islamic pattern on top ── */}
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Soft radial halo behind the right-aligned copy, for extra legibility ── */}
      <div
        aria-hidden
        className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 h-[36rem] w-[46rem] rounded-full bg-rmc-green/20 blur-[120px] pointer-events-none"
      />

      {/* ── Floating particles ── */}
      <Particle top="20%" left="12%" dur="8s" delay="0s" size={5} />
      <Particle top="65%" left="9%" dur="11s" delay="1.5s" size={3} />
      <Particle top="30%" left="85%" dur="9s" delay="0.8s" size={4} />
      <Particle top="70%" left="78%" dur="12s" delay="2.5s" size={3} />
      <Particle top="50%" left="55%" dur="10s" delay="3s" size={3} />

      {/* ── Bottom fade — tucked behind the stat bar so dark layers never stack ── */}
      <div className="absolute bottom-0 left-0 right-0 h-28 z-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-36 pb-24">
        <div className="max-w-xl ml-auto text-right">
          {/* Greeting eyebrow — Arabic salam with a gold rule */}
          <div className="animate-fade-up flex items-center justify-end gap-3" style={{ animationDelay: '160ms' }}>
            <span
              className="font-arabic text-rmc-gold-light text-base md:text-lg leading-loose drop-shadow"
              dir="rtl"
            >
              {content.salam}
            </span>
            <span aria-hidden className="h-px w-8 rounded-full bg-gradient-to-l from-transparent to-rmc-gold" />
          </div>

          {/* Headline */}
          <h2
            className={`animate-fade-up mt-5 text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight drop-shadow-lg ${locale === 'ar' ? 'font-arabic' : ''}`}
            style={{ animationDelay: '260ms' }}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            {headlineLead && <>{headlineLead} </>}
            <span className="bg-gradient-to-r from-rmc-gold-light via-rmc-gold to-rmc-gold-light bg-clip-text text-transparent">
              {headlineAccent}
            </span>
          </h2>

          {/* Subtitle */}
          <p
            className={`animate-fade-up mt-5 ml-auto max-w-md text-white/75 text-sm md:text-[15px] leading-relaxed ${locale === 'ar' ? 'font-arabic' : ''}`}
            style={{ animationDelay: '420ms' }}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            {pick(content.subtitle, locale)}
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex flex-col sm:flex-row gap-3 items-end sm:items-center sm:justify-end animate-fade-up"
            style={{ animationDelay: '500ms' }}
          >
            <Link
              href={`/${locale}${content.primaryHref}`}
              className={`group inline-flex items-center justify-center px-7 py-2.5 bg-rmc-green text-white font-semibold rounded-full text-sm shadow-xl shadow-rmc-green/30 hover:bg-rmc-green-dark hover:shadow-rmc-green/50 hover:scale-105 active:scale-100 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:scale-100 ${locale === 'ar' ? 'font-arabic' : ''}`}
            >
              {pick(content.primaryCta, locale)}
            </Link>
            <Link
              href={`/${locale}${content.secondaryHref}`}
              className={`group inline-flex items-center justify-center px-7 py-2.5 border border-white/40 text-white font-semibold rounded-full text-sm hover:bg-white/10 hover:border-white/70 transition-all duration-300 motion-reduce:transition-none ${locale === 'ar' ? 'font-arabic' : ''}`}
            >
              {pick(content.secondaryCta, locale)}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom chrome: slide dots + scroll cue, centered ── */}
      <div className="absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-4">
        <div className="animate-fade-up pointer-events-auto" style={{ animationDelay: '560ms' }}>
          <SlideIndicators total={slideCount} current={current} onChange={goTo} />
        </div>
        <div className="flex flex-col items-center gap-1 animate-bounce-soft motion-reduce:animate-none pointer-events-none">
          <ChevronDown className="w-5 h-5 text-white/35" />
        </div>
      </div>
    </section>
  );
}
