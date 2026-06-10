'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Users, MapPin, ChevronDown } from 'lucide-react';

/* Real RMC community event photos */
const SLIDES = [
  {
    src: 'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
    quote: { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'Indeed, with hardship [will be] ease.', ref: 'Ash-Sharh 94:6' },
  },
  {
    src: 'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
    quote: { ar: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', en: 'And whoever fears Allah — He will make for him a way out.', ref: 'At-Talaq 65:2' },
  },
];

function SlideIndicators({ total, current, onChange }: { total: number; current: number; onChange: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`transition-all duration-500 rounded-full ${
            i === current
              ? 'bg-rmc-gold w-7 h-2'
              : 'bg-white/40 hover:bg-white/60 w-2 h-2'
          }`}
          aria-label={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* Floating particle */
function Particle({ top, left, dur, delay, size = 4 }: {
  top: string; left: string; dur: string; delay: string; size?: number;
}) {
  return (
    <div
      className="particle absolute rounded-full bg-rmc-gold/30 pointer-events-none"
      style={{ top, left, width: size, height: size, '--dur': dur, '--delay': delay } as React.CSSProperties}
    />
  );
}

export function HeroSection() {
  const t = useTranslations('home.hero');
  const { locale } = useParams<{ locale: string }>();
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  /* Auto-advance slideshow */
  useEffect(() => {
    const id = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % SLIDES.length);
        setTransitioning(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const goTo = (i: number) => {
    if (i === current) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(i); setTransitioning(false); }, 600);
  };

  const slide = SLIDES[current];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-rmc-green-deep">

      {/* ── Background image layer (crossfade) ── */}
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{ opacity: i === current && !transitioning ? 1 : 0 }}
        >
          <Image
            src={s.src}
            alt=""
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* ── Dark gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* ── Subtle Islamic pattern on top ── */}
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Floating particles ── */}
      <Particle top="20%" left="12%" dur="8s" delay="0s" size={5} />
      <Particle top="65%" left="9%"  dur="11s" delay="1.5s" size={3} />
      <Particle top="30%" left="85%" dur="9s"  delay="0.8s" size={4} />
      <Particle top="70%" left="78%" dur="12s" delay="2.5s" size={3} />
      <Particle top="50%" left="55%" dur="10s" delay="3s"   size={3} />

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-36 pb-40">
        <div className="max-w-3xl">

          {/* Animated quote — changes with slide */}
          <div
            className={`transition-all duration-700 ease-out ${
              transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Arabic verse */}
            <p className="text-3xl md:text-5xl font-arabic text-white leading-loose mb-4 drop-shadow-lg" dir="rtl">
              {slide.quote.ar}
            </p>

            {/* Translation */}
            <p className="text-white/80 text-lg md:text-xl italic mb-2">
              &ldquo;{slide.quote.en}&rdquo;
            </p>
            <p className="text-rmc-gold text-sm font-semibold mb-10">— {slide.quote.ref}</p>
          </div>

          {/* Platform title */}
          <h1
            className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4 animate-fade-up drop-shadow-md"
            style={{ animationDelay: '200ms' }}
          >
            {t('title')}
          </h1>

          <p
            className="text-lg text-white/65 mb-10 max-w-xl leading-relaxed animate-fade-up"
            style={{ animationDelay: '340ms' }}
          >
            {t('subtitle')}
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 mb-14 animate-fade-up"
            style={{ animationDelay: '460ms' }}
          >
            <Link
              href={`/${locale}/member/register`}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-rmc-green text-white font-semibold rounded-full text-base shadow-xl shadow-rmc-green/30 hover:bg-rmc-green-dark hover:shadow-rmc-green/50 hover:scale-105 active:scale-100 transition-all duration-300"
            >
              <Users className="w-4 h-4 shrink-0" />
              Applications
            </Link>
            <Link
              href={`/${locale}/about`}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-full text-base hover:bg-white/10 hover:border-white/70 transition-all duration-300"
            >
              Our Staff
              <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Slide indicators */}
          <div
            className="animate-fade-up flex items-center gap-6"
            style={{ animationDelay: '560ms' }}
          >
            <SlideIndicators total={SLIDES.length} current={current} onChange={goTo} />

            {/* Quick stats */}
            <div className="h-5 w-px bg-white/20" />
            <div className="flex items-center gap-5">
              {[
                { Icon: Users, value: '12,500+', label: 'Members' },
                { Icon: MapPin, value: '320+', label: 'Mosques' },
              ].map(({ Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-rmc-gold shrink-0" />
                  <span className="text-white font-bold text-sm">{value}</span>
                  <span className="text-white/40 text-xs hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll cue ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce-soft pointer-events-none">
        <ChevronDown className="w-5 h-5 text-white/35" />
      </div>

      {/* ── Bottom fade — seamless blend into next section ── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
    </section>
  );
}
