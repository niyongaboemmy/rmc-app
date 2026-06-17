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
  ArrowRight,
  Pause,
  Play,
} from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { PrayerColumn } from './PrayerColumn';

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
  /** Short Quran verse that frames the slide — a 1:1 echo of the hero's quote block (ar + en + ref) */
  verse: { ar: string; en: string; ref: string };
}

const SLIDES: Slide[] = [
  {
    badge: 'Scholarships 2025',
    title: 'Apply for the RMC Education Scholarship Program',
    description:
      "Full and partial scholarships for Muslim students across Rwanda — primary, secondary, and university levels. Applications close June 30th. Secure your child's future today.",
    cta: 'Apply Now',
    ctaHref: '/services',
    Icon: GraduationCap,
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Graduation caps thrown in celebration',
    stat: { value: '500+', label: 'Scholarships awarded' },
    verse: { ar: 'اقْرَأْ بِاسْمِ رَبِّكَ', en: 'Read in the name of your Lord.', ref: 'Al-Alaq 96:1' },
  },
  {
    badge: 'Community Programs',
    title: 'Join Our Social Development Initiatives Across Rwanda',
    description:
      'Microfinance support, vocational training, health outreach, and youth empowerment projects spanning all five provinces. Together we build stronger communities.',
    cta: 'Learn More',
    ctaHref: '/about',
    Icon: Users,
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Community members gathered together',
    stat: { value: '12,500+', label: 'Community members' },
    verse: { ar: 'وَتَعَاوَنُوا عَلَى الْبِرِّ', en: 'And cooperate in righteousness.', ref: 'Al-Maidah 5:2' },
  },
  {
    badge: 'Support Our Mission',
    title: 'Make a Difference — Donate to the Muslim Community',
    description:
      'Your donation supports mosques, schools, orphans, and social programs across Rwanda. Every contribution, big or small, builds a stronger ummah. Earn your reward today.',
    cta: 'Donate Now',
    ctaHref: '/donate',
    Icon: Heart,
    image:
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'Hands giving a charitable donation',
    stat: { value: '5,000+', label: 'Families supported' },
    verse: { ar: 'مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ', en: 'Who is it that will lend to Allah?', ref: 'Al-Baqarah 2:245' },
  },
  {
    badge: 'International Affairs',
    title: 'Global Islamic Cooperation & Partnerships',
    description:
      'RMC collaborates with international Islamic organizations, embassies, and NGOs to bring scholarships, resources, and global support to the Rwandan Muslim community.',
    cta: 'Discover More',
    ctaHref: '/about',
    Icon: Globe,
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=900&auto=format&fit=crop',
    imageAlt: 'International partnership handshake',
    stat: { value: '20+', label: 'Global partners' },
    verse: { ar: 'وَجَعَلْنَاكُمْ شُعُوبًا', en: 'And We made you peoples and tribes.', ref: 'Al-Hujurat 49:13' },
  },
];

/* Floating gold particle — identical mechanics + coordinates to the hero (.particle + --dur/--delay) */
function Particle({
  top,
  left,
  dur,
  delay,
  size = 4,
  paused = false,
}: {
  top: string;
  left: string;
  dur: string;
  delay: string;
  size?: number;
  paused?: boolean;
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
          animationPlayState: paused ? 'paused' : 'running',
        } as React.CSSProperties
      }
    />
  );
}

export function WelcomeCarouselSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref, visible } = useScrollReveal(0.1);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const change = useCallback(
    (resolve: (c: number) => number) => {
      setAnimating(true);
      window.setTimeout(() => {
        setCurrent(resolve);
        setAnimating(false);
      }, 420);
    },
    [],
  );

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      change(() => index);
    },
    [animating, current, change],
  );

  const next = useCallback(() => {
    change((c) => (c + 1) % SLIDES.length);
  }, [change]);

  const prev = useCallback(() => {
    change((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  }, [change]);

  /* Autoplay — slow enough to comfortably read each slide; pauses on hover / focus-within (WCAG 2.2.2) */
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      change((c) => (c + 1) % SLIDES.length);
    }, 11000);
    return () => window.clearInterval(id);
  }, [paused, change]);

  const slide = SLIDES[current];
  const { Icon } = slide;

  /* Reusable focus ring for every interactive control */
  const ring =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rmc-green-deep';

  return (
    <section
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative isolate overflow-hidden bg-rmc-green-deep"
      aria-roledescription="carousel"
      aria-label="Updates and programs"
    >
      {/* ── Full-bleed photographic crossfade — identical mechanics to the hero ── */}
      {SLIDES.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === current && !animating ? 1 : 0 }}
          aria-hidden={i !== current}
        >
          <Image
            src={s.image}
            alt={i === current ? s.imageAlt : ''}
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* ── Symmetric dark scrim — centered content reads cleanly, mirrors the hero's overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-rmc-green-deep/85 via-rmc-green-deep/55 to-rmc-green-deep/85" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* ── Islamic geometric texture ── */}
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Floating gold particles — hero's exact coordinate / duration set; freeze on hover ── */}
      <Particle top="20%" left="12%" dur="8s" delay="0s" size={5} paused={paused} />
      <Particle top="65%" left="9%" dur="11s" delay="1.5s" size={3} paused={paused} />
      <Particle top="30%" left="85%" dur="9s" delay="0.8s" size={4} paused={paused} />
      <Particle top="70%" left="78%" dur="12s" delay="2.5s" size={3} paused={paused} />
      <Particle top="50%" left="55%" dur="10s" delay="3s" size={3} paused={paused} />

      {/* ── Top gold hairline — seams this section to the hero above ── */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-14">

        {/* Two distinct sections side by side: Updates & Programs (left) + Prayer Times (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          {/* ════════ LEFT — Updates & Programs ════════ */}
          <div className="lg:col-span-2 relative">
            {/* Section header — belongs to the updates carousel only */}
            <div
              className={`text-center mb-7 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: '120ms' }}
            >
              <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-white/75">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                Updates &amp; Programs
              </span>
              <h2 className="mt-4 text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-tight">
                Initiatives shaping the <span className="text-gradient-gold">Rwandan ummah</span>
              </h2>
            </div>

          {/* Entrance wrapper (scroll-reveal) — kept SEPARATE from the per-slide crossfade node */}
          <div
            className={`relative ${visible ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '260ms' }}
          >
            {/* Per-slide crossfade node — its own opacity/transform, no fade-up conflict */}
            <div
              className={`max-w-xl mx-auto text-center glass rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                animating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
              }`}
            >
              {/* Eyebrow row — refined gold icon tile + glass badge */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <span className="grid place-items-center w-11 h-11 rounded-2xl bg-rmc-gold/15 border border-rmc-gold/30 text-rmc-gold shadow-inner">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                  {slide.badge}
                </span>
              </div>

              {/* Headline */}
              <h3 className="text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-lg mb-3">
                {slide.title}
              </h3>

              <p className="text-white/75 text-sm md:text-base leading-relaxed mb-5 max-w-md mx-auto">
                {slide.description}
              </p>

              {/* Gold stat chip */}
              <div className="inline-flex items-center gap-3 mb-6 px-4 py-2.5 rounded-2xl border border-rmc-gold/30 bg-rmc-gold/10 backdrop-blur-sm">
                <p className="text-2xl font-bold text-rmc-gold-light leading-none">{slide.stat.value}</p>
                <span className="h-7 w-px bg-white/15" />
                <p className="text-[11px] font-medium text-white/65 leading-tight max-w-[8rem]">
                  {slide.stat.label}
                </p>
              </div>

              {/* CTAs — verbatim hero button grammar (primary green pill + glass secondary) */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/${locale}${slide.ctaHref}`}
                  className={`group inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-rmc-green text-white font-semibold rounded-full text-sm shadow-xl shadow-rmc-green/30 hover:bg-rmc-green-dark hover:shadow-rmc-green/50 hover:scale-105 active:scale-100 transition-all duration-300 ${ring}`}
                >
                  {slide.cta}
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href={`/${locale}/donate`}
                  className={`group inline-flex items-center justify-center gap-2 px-7 py-2.5 border border-white/40 text-white font-semibold rounded-full text-sm hover:bg-white/10 hover:border-white/70 transition-all duration-300 ${ring}`}
                >
                  <Heart className="w-4 h-4 shrink-0" />
                  Donate
                </Link>
              </div>
            </div>
          </div>

          {/* Single, unified control row — centered: arrow pair, dot set, pause toggle, counter */}
          <div
            className={`mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '460ms' }}
          >
            {/* Prev / Next glass arrows — 44px touch targets */}
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                className={`grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/15 hover:border-white/40 hover:scale-105 active:scale-100 transition-all duration-300 ${ring}`}
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className={`grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/15 hover:border-white/40 hover:scale-105 active:scale-100 transition-all duration-300 ${ring}`}
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Gold/white dot indicators — plain labeled buttons (announced semantics match behavior) */}
            <div className="flex items-center gap-3" role="group" aria-label="Choose a slide">
              {SLIDES.map((s, i) => (
                <button
                  key={s.badge}
                  onClick={() => goTo(i)}
                  aria-label={`${s.badge} (slide ${i + 1} of ${SLIDES.length})`}
                  aria-current={i === current}
                  className={`grid place-items-center w-7 h-11 ${ring} rounded-full`}
                >
                  <span
                    className={`block transition-all duration-500 rounded-full ${
                      i === current ? 'bg-rmc-gold w-7 h-2' : 'bg-white/40 hover:bg-white/60 w-2 h-2'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Pause / play toggle — required for WCAG 2.2.2 moving content */}
            <button
              onClick={() => setPaused((p) => !p)}
              className={`grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/15 hover:border-white/40 transition-all duration-300 ${ring}`}
              aria-label={paused ? 'Play automatic slideshow' : 'Pause automatic slideshow'}
              aria-pressed={paused}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Persistent 01 / 04 counter */}
            <div className="flex items-center gap-2 text-white/55 text-xs font-medium tracking-wide">
              <span className="text-rmc-gold font-bold tabular-nums">
                {String(current + 1).padStart(2, '0')}
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span className="tabular-nums">{String(SLIDES.length).padStart(2, '0')}</span>
            </div>
          </div>
          </div>

          {/* Live prayer times — right column */}
          <div className="lg:col-span-1">
            <PrayerColumn />
          </div>
        </div>
      </div>

      {/* ── Screen-reader live region — announces slide changes politely ── */}
      <p ref={liveRef} aria-live="polite" className="sr-only">
        {`Slide ${current + 1} of ${SLIDES.length}: ${slide.badge}. ${slide.title}`}
      </p>

      {/* ── Bottom gold hairline — brackets the section symmetrically (Approach 2) ── */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent z-10" />

      {/* ── Bottom green-deep blend — seamless seam into the next section ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-rmc-green-deep via-rmc-green-deep/40 to-transparent pointer-events-none" />
    </section>
  );
}
