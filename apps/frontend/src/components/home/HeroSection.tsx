'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, FileText, TrendingUp, ChevronDown } from 'lucide-react';

/* Real RMC community event photos */
const SLIDES = [
  {
    src: 'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
    quote: {
      ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
      en: 'Indeed, with hardship [will be] ease.',
      ref: 'Ash-Sharh 94:6',
    },
  },
  {
    src: 'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
    quote: {
      ar: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
      en: 'And whoever fears Allah — He will make for him a way out.',
      ref: 'At-Talaq 65:2',
    },
  },
];

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

  /* Auto-advance slideshow (paused for reduced-motion users) */
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
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
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none"
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

      {/* ── Directional overlay — image stays clear on the left, text readable on the right ── */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15" />

      {/* ── Subtle Islamic pattern on top ── */}
      <div className="absolute inset-0 pattern-islamic opacity-30" />

      {/* ── Verse of the day — continuous right-to-left ticker below the navbar ── */}
      <div className="absolute top-[76px] md:top-[84px] inset-x-0 z-20 overflow-hidden border-y border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex w-max animate-marquee py-2">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
              {SLIDES.map((s, i) => (
                <span key={i} className="flex items-center gap-2.5 px-12 whitespace-nowrap text-xs">
                  <span className="font-arabic text-white" dir="rtl">
                    {s.quote.ar}
                  </span>
                  <span className="text-white/30">—</span>
                  <span className="text-white/70 italic">&ldquo;{s.quote.en}&rdquo;</span>
                  <span className="text-rmc-gold text-[10px] font-semibold tracking-wide">
                    {s.quote.ref}
                  </span>
                  <span className="text-rmc-gold/40 pl-5" aria-hidden="true">
                    ◆
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating particles ── */}
      <Particle top="20%" left="12%" dur="8s" delay="0s" size={5} />
      <Particle top="65%" left="9%" dur="11s" delay="1.5s" size={3} />
      <Particle top="30%" left="85%" dur="9s" delay="0.8s" size={4} />
      <Particle top="70%" left="78%" dur="12s" delay="2.5s" size={3} />
      <Particle top="50%" left="55%" dur="10s" delay="3s" size={3} />

      {/* ── Bottom fade — tucked behind the stat bar so dark layers never stack ── */}
      <div className="absolute bottom-0 left-0 right-0 h-28 z-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-32 pb-40">
        <div className="max-w-2xl ml-auto text-right">
          {/* Welcoming intro — the centerpiece */}
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            {/* Warm Islamic greeting */}
            <p
              className="font-arabic text-rmc-gold-light text-lg md:text-xl mb-3 leading-loose drop-shadow"
              dir="rtl"
            >
              السَّلَامُ عَلَيْكُمْ
            </p>

            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
              Rwanda Muslim Community
            </h2>

            <p className="text-white/70 text-sm md:text-base mb-10 max-w-md ml-auto leading-relaxed">
              Faith, knowledge, and service — for the Muslim community across Rwanda.
            </p>
          </div>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 items-end sm:items-center sm:justify-end animate-fade-up"
            style={{ animationDelay: '460ms' }}
          >
            <Link
              href={`/${locale}/services`}
              className="group inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-rmc-green text-white font-semibold rounded-full text-sm shadow-xl shadow-rmc-green/30 hover:bg-rmc-green-dark hover:shadow-rmc-green/50 hover:scale-105 active:scale-100 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <FileText className="w-4 h-4 shrink-0" />
              Request a Service
            </Link>
            <Link
              href={`/${locale}/activities`}
              className="group inline-flex items-center justify-center gap-2 px-7 py-2.5 border border-white/40 text-white font-semibold rounded-full text-sm hover:bg-white/10 hover:border-white/70 transition-all duration-300 motion-reduce:transition-none"
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              Trends
              <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom chrome: slide dots + scroll cue, centered ── */}
      <div className="absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-4">
        <div className="animate-fade-up pointer-events-auto" style={{ animationDelay: '560ms' }}>
          <SlideIndicators total={SLIDES.length} current={current} onChange={goTo} />
        </div>
        <div className="flex flex-col items-center gap-1 animate-bounce-soft motion-reduce:animate-none pointer-events-none">
          <ChevronDown className="w-5 h-5 text-white/35" />
        </div>
      </div>
    </section>
  );
}
