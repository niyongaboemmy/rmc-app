'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  GraduationCap,
  Globe,
  Users,
  Pause,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { PrayerColumn } from './PrayerColumn';
import {
  ContentKeys,
  UPDATES_DEFAULT,
  getSiteContent,
  mergeContent,
  isRtl,
  pick,
  type UpdatesContent,
} from '@/lib/content-api';

interface Slide {
  badge: string;
  title: string;
  description: string;
  cta: string;
  ctaHref: string;
  Icon: React.ComponentType<{ className?: string }>;
  image: string;
  imageAlt: string;
  stat: { value: string; label: string };
}

/** lucide icon name → component, for resolving UpdateSlide.icon. */
const ICONS: Record<string, LucideIcon> = { GraduationCap, Users, Heart, Globe };

export function WelcomeCarouselSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref, visible } = useScrollReveal(0.1);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Content managed from Admin → Content → Updates & Programs. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<UpdatesContent>(UPDATES_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<UpdatesContent>(ContentKeys.updates)
      .then((data) => {
        if (active && data) setContent(mergeContent(UPDATES_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const rtl = isRtl(locale);
  const heading = pick(content.heading, locale);

  const SLIDES: Slide[] = content.items.map((item) => ({
    badge: pick(item.badge, locale),
    title: pick(item.title, locale),
    description: pick(item.description, locale),
    cta: pick(item.cta, locale),
    ctaHref: item.ctaHref,
    Icon: ICONS[item.icon] ?? GraduationCap,
    image: item.image,
    imageAlt: item.imageAlt,
    stat: { value: item.statValue, label: pick(item.statLabel, locale) },
  }));

  const change = useCallback((resolve: (c: number) => number) => {
    setAnimating(true);
    window.setTimeout(() => {
      setCurrent(resolve);
      setAnimating(false);
    }, 380);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      change(() => index);
    },
    [animating, current, change],
  );

  const next = useCallback(() => {
    change((c) => (c + 1) % SLIDES.length);
  }, [change, SLIDES.length]);

  const prev = useCallback(() => {
    change((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  }, [change, SLIDES.length]);

  /* Autoplay — pauses on hover / focus-within (WCAG 2.2.2) */
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      change((c) => (c + 1) % SLIDES.length);
    }, 11000);
    return () => window.clearInterval(id);
  }, [paused, change, SLIDES.length]);

  const safeIndex = Math.min(current, SLIDES.length - 1);
  const slide = SLIDES[safeIndex];
  const { Icon } = slide;

  const ring =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  return (
    <section
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative isolate overflow-hidden bg-transparent"
      aria-roledescription="carousel"
      aria-label="Updates and programs"
    >
      {/* Light Islamic geometry + symmetric gold hairlines — matches the sibling light sections */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-50 pointer-events-none" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute -top-24 left-1/3 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 md:py-12">
        {/* Section header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-8 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: '120ms' }}
        >
          <span className="inline-flex items-center gap-2.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 px-4 py-1.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-rmc-green-dark backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
            <span dir={rtl ? 'rtl' : undefined} className={rtl ? 'font-arabic' : undefined}>{heading}</span>
          </span>
          <h2
            className={`mt-4 text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {pick({ en: 'Initiatives shaping the', rw: 'Gahunda zubaka', ar: 'مبادرات تبني' }, locale)}{' '}
            <span className="text-rmc-green">
              {pick({ en: 'Rwandan ummah', rw: 'umat nyarwanda', ar: 'الأمة الرواندية' }, locale)}
            </span>
          </h2>
        </div>

        {/* Two clean, matched, equal-height white panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* ════════ LEFT — Updates & Programs ════════ */}
          <article
            className={`lg:col-span-2 relative h-full flex flex-col overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-[0_1px_2px_rgba(13,61,36,0.04),0_16px_40px_-24px_rgba(13,61,36,0.22)] ${
              visible ? 'animate-fade-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '240ms' }}
          >
            <div className="relative flex flex-1 flex-col md:flex-row">
              {/* Media — clean, contained photo */}
              <div className="relative h-44 md:h-auto md:w-[38%] shrink-0 overflow-hidden border-b border-gray-100 md:border-b-0 md:border-r">
                {SLIDES.map((s, i) => (
                  <div
                    key={s.image}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
                    style={{ opacity: i === current && !animating ? 1 : 0 }}
                    aria-hidden={i !== current}
                  >
                    <Image
                      src={s.image}
                      alt={i === current ? s.imageAlt : ''}
                      fill
                      priority={i === 0}
                      className="object-cover object-center"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="relative flex flex-1 flex-col p-5 sm:p-6">
                <div
                  className={`flex-1 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                    animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                  }`}
                >
                  {/* Eyebrow — plain icon + label */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <Icon className="w-4 h-4 text-rmc-green shrink-0" />
                    <span
                      dir={rtl ? 'rtl' : undefined}
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-gold ${rtl ? 'font-arabic' : ''}`}
                    >
                      {slide.badge}
                    </span>
                  </div>

                  <h3
                    dir={rtl ? 'rtl' : undefined}
                    className={`text-lg md:text-xl font-bold text-gray-900 leading-snug mb-2 line-clamp-2 ${rtl ? 'font-arabic' : ''}`}
                  >
                    {slide.title}
                  </h3>
                  <p
                    dir={rtl ? 'rtl' : undefined}
                    className={`text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3 ${rtl ? 'font-arabic' : ''}`}
                  >
                    {slide.description}
                  </p>

                  {/* Stat — plain */}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold text-rmc-green tabular-nums leading-none">
                      {slide.stat.value}
                    </span>
                    <span
                      dir={rtl ? 'rtl' : undefined}
                      className={`text-sm text-gray-500 ${rtl ? 'font-arabic' : ''}`}
                    >
                      {slide.stat.label}
                    </span>
                  </div>

                  {/* CTAs */}
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <Link
                      href={`/${locale}${slide.ctaHref}`}
                      className={`inline-flex items-center justify-center px-5 py-2 bg-rmc-green text-white font-semibold rounded-full text-sm shadow-sm shadow-rmc-green/20 hover:bg-rmc-green-dark transition-colors duration-200 ${ring} ${rtl ? 'font-arabic' : ''}`}
                    >
                      {slide.cta}
                    </Link>
                    <Link
                      href={`/${locale}/donate`}
                      className={`inline-flex items-center justify-center px-5 py-2 border border-rmc-green/30 text-rmc-green-dark font-semibold rounded-full text-sm hover:bg-rmc-green-light/50 hover:border-rmc-green/50 transition-colors duration-200 ${ring}`}
                    >
                      {pick({ en: 'Donate', rw: 'Gutera inkunga', ar: 'تبرّع' }, locale)}
                    </Link>
                  </div>
                </div>

                {/* Control bar — position dots on the left, a tight control cluster on the right */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2" role="group" aria-label="Choose a slide">
                    {SLIDES.map((s, i) => (
                      <button
                        key={s.badge}
                        onClick={() => goTo(i)}
                        aria-label={`${s.badge} (slide ${i + 1} of ${SLIDES.length})`}
                        aria-current={i === current}
                        className={`grid place-items-center h-8 ${ring} rounded-full`}
                      >
                        <span
                          className={`block transition-all duration-300 rounded-full ${
                            i === current ? 'bg-rmc-green w-5 h-1.5' : 'bg-gray-300 hover:bg-gray-400 w-1.5 h-1.5'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={prev}
                      className={`grid place-items-center w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors ${ring}`}
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPaused((p) => !p)}
                      className={`grid place-items-center w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors ${ring}`}
                      aria-label={paused ? 'Play automatic slideshow' : 'Pause automatic slideshow'}
                      aria-pressed={paused}
                    >
                      {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={next}
                      className={`grid place-items-center w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors ${ring}`}
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ════════ RIGHT — Prayer Times ════════ */}
          <div
            className={`lg:col-span-1 h-full ${visible ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '360ms' }}
          >
            <PrayerColumn />
          </div>
        </div>
      </div>

      {/* Screen-reader live region */}
      <p ref={liveRef} aria-live="polite" className="sr-only">
        {`Slide ${current + 1} of ${SLIDES.length}: ${slide.badge}. ${slide.title}`}
      </p>
    </section>
  );
}
