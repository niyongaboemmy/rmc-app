'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { publicApi } from '@/lib/public-api';
import Image from 'next/image';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface VerseData {
  surah: number;
  ayah: number;
  arabicText: string;
  translationEn: string;
  reference: string;
}

function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center gap-4 my-7">
      <div className="h-px w-20 bg-gradient-to-r from-transparent to-rmc-gold/50" />
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <path
          d="M14 2 L16 9 L23 9 L17.5 13.5 L19.5 21 L14 16.5 L8.5 21 L10.5 13.5 L5 9 L12 9 Z"
          fill="#D4A017"
          opacity="0.9"
        />
      </svg>
      <div className="h-px w-20 bg-gradient-to-l from-transparent to-rmc-gold/50" />
    </div>
  );
}

export function VerseOfDay() {
  const t = useTranslations('home.verseOfDay');
  const [verse, setVerse] = useState<VerseData | null>(null);
  const { ref, visible } = useScrollReveal(0.1);

  useEffect(() => {
    publicApi.getVerseOfDay().then(setVerse).catch(() => null);
  }, []);

  const fallback: VerseData = {
    surah: 94,
    ayah: 6,
    arabicText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translationEn: 'Indeed, with hardship [will be] ease.',
    reference: 'Ash-Sharh 94:6',
  };

  const display = verse ?? fallback;

  return (
    <section className="relative overflow-hidden py-24 -mt-1">
      {/* Background photo */}
      <Image
        src="https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop"
        alt=""
        fill
        className="object-cover object-center"
      />

      {/* Dark overlay + green tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-rmc-green-deep/90 to-black/80" />

      {/* Islamic pattern overlay */}
      <div className="absolute inset-0 pattern-islamic opacity-40" />

      {/* Gold top & bottom accent lines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rmc-green/15 rounded-full blur-[100px] pointer-events-none" />

      <div
        ref={ref}
        className={`relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
        }`}
      >
        {/* Section badge */}
        <div className="inline-flex items-center gap-2 bg-rmc-gold/15 border border-rmc-gold/30 text-rmc-gold px-5 py-1.5 rounded-full text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold animate-pulse" />
          {t('title')}
        </div>

        {/* Decorative top corner stars */}
        <div className="absolute -top-2 left-8 opacity-20">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 3L22.5 13H33L24.5 19L27 29L20 23L13 29L15.5 19L7 13H17.5Z" fill="#D4A017" />
          </svg>
        </div>
        <div className="absolute -top-2 right-8 opacity-20">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 3L22.5 13H33L24.5 19L27 29L20 23L13 29L15.5 19L7 13H17.5Z" fill="#D4A017" />
          </svg>
        </div>

        {/* Arabic verse — delayed reveal */}
        <p
          className={`text-4xl md:text-5xl font-arabic leading-loose text-white mb-2 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '150ms' }}
          dir="rtl"
        >
          {display.arabicText}
        </p>

        <div
          className={`transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '350ms' }}
        >
          <OrnamentDivider />
        </div>

        {/* Translation */}
        <p
          className={`text-lg md:text-xl text-white/65 italic leading-relaxed mb-5 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '450ms' }}
        >
          &ldquo;{display.translationEn}&rdquo;
        </p>

        {/* Reference */}
        <p
          className={`text-rmc-gold text-sm font-semibold tracking-wide transition-all duration-500 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          — {display.reference}
        </p>
      </div>
    </section>
  );
}
