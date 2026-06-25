'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  WHO_WE_ARE_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  pickLang,
  type WhoWeAreContent,
} from '@/lib/content-api';

export function WhoWeAreSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: headerRef, visible: headerVisible } = useScrollReveal(0.15);
  const { ref: bodyRef, visible: bodyVisible } = useScrollReveal(0.1);

  // Content managed from Admin → Content → Who We Are. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<WhoWeAreContent>(WHO_WE_ARE_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, string>>(ContentKeys.whoWeAre)
      .then((data) => {
        if (active && data) setContent(mergeContent(WHO_WE_ARE_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const description = pickLang(content, 'description', locale);

  return (
    <section className="relative bg-transparent py-14 md:py-20 overflow-hidden">
      {/* Faint Islamic geometric texture — echoes the hero's pattern overlay */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      {/* Soft ambient light wash */}
      <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[90px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header — centered */}
        <div
          ref={headerRef}
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          {/* Shared hero-consistent eyebrow */}
          <div
            className={`inline-flex items-center gap-2.5 mb-6 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
            {pick({ en: 'Who We Are', rw: 'Abo Turi Bo', ar: 'من نحن' }, locale)}
          </div>

          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 mb-5 ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            {pickLang(content, 'heading', locale)}{' '}
            <span className="text-rmc-green">
              {pickLang(content, 'headingHighlight', locale)}
            </span>
          </h2>

          {/* Arabic touch framed by gold ornament — echoes the hero's scripture centerpiece */}
          <div className="ornament-divider max-w-md mx-auto mb-3">
            <p className="font-arabic text-rmc-green-dark text-lg md:text-xl leading-loose text-center px-2" dir="rtl">
              {pickLang(content, 'verse', locale)}
            </p>
          </div>
          <p
            className={`text-rmc-gold text-[11px] font-semibold tracking-wide mb-6 ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            {pickLang(content, 'verseRef', locale)}
          </p>

          <p
            className={`text-gray-500 leading-relaxed text-sm md:text-base max-w-2xl mx-auto ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            {description}
          </p>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className={`transition-all duration-700 delay-150 ${
            bodyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
            <Link
              href={`/${locale}/about`}
              className="group inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-rmc-green text-white text-sm font-bold rounded-full shadow-lg shadow-rmc-green/25 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 motion-safe:hover:scale-105 transition-all duration-300"
            >
              <BookOpen className="w-4 h-4" />
              {pick({ en: 'Learn Our Story', rw: 'Menya Inkuru Yacu', ar: 'تعرّف على قصتنا' }, locale)}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center gap-2 px-7 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-full hover:border-rmc-green hover:text-rmc-green motion-safe:hover:scale-105 transition-all duration-300"
            >
              {pick({ en: 'Contact Us', rw: 'Twandikire', ar: 'اتصل بنا' }, locale)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
