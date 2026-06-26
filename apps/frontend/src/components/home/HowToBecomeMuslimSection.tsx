'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HeartHandshake, Heart, MessageSquareQuote, Droplets,
  Sparkles, MapPin, CheckCircle2, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  HOW_TO_BECOME_MUSLIM_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  type HowToBecomeMuslimContent,
  type HowStep,
} from '@/lib/content-api';

// lucide icon names used by the step cards → components.
const STEP_ICONS: Record<string, LucideIcon> = {
  Heart,
  MessageSquareQuote,
  Droplets,
  Sparkles,
  MapPin,
  HeartHandshake,
  CheckCircle2,
};

// Each step links out to the Ijwi Islam learning resource.
const STEP_LINK = 'https://ijwi-islam.org/';

export function HowToBecomeMuslimSection() {
  const { locale } = useParams<{ locale: string }>();
  const isAr = locale === 'ar';

  const [content, setContent] = useState<HowToBecomeMuslimContent>(HOW_TO_BECOME_MUSLIM_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, unknown>>(ContentKeys.howToBecomeMuslim)
      .then((data) => {
        if (active && data) setContent(mergeContent(HOW_TO_BECOME_MUSLIM_DEFAULT, data));
      })
      .catch(() => {/* keep defaults */});
    return () => {
      active = false;
    };
  }, []);

  const { ref: headerRef, visible: headerVisible } = useScrollReveal(0.15);
  const { ref: mediaRef, visible: mediaVisible } = useScrollReveal(0.1);

  return (
    <section className="relative bg-white py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[480px] h-[480px] bg-rmc-green-light rounded-full -translate-y-1/2 -translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`max-w-3xl mx-auto text-center mb-12 md:mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div
            className={`inline-flex items-center gap-2.5 mb-5 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark ${isAr ? 'font-arabic' : ''}`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-rmc-gold shrink-0" />
            {pick(content.eyebrow, locale)}
          </div>

          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${isAr ? 'font-arabic' : ''}`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {pick(content.title, locale)}{' '}
            <span className="title-underline text-rmc-green">{pick(content.titleAccent, locale)}</span>
          </h2>

          <p
            className={`text-gray-500 mt-4 text-sm md:text-base leading-relaxed ${isAr ? 'font-arabic' : ''}`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {pick(content.lede, locale)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Left — video + Shahada words to read */}
          <div
            ref={mediaRef}
            className={`transition-all duration-700 ${
              mediaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* The Shahada — words to read */}
            <div className="mt-7 rounded-3xl border border-rmc-gold/25 bg-gradient-to-b from-rmc-green-light/40 to-white p-6 md:p-8 text-center">
              <p className={`text-rmc-gold text-[11px] font-semibold uppercase tracking-[0.18em] mb-4 ${isAr ? 'font-arabic' : ''}`}>
                {pick(content.shahadaLabel, locale)}
              </p>

              <div className="ornament-divider max-w-md mx-auto mb-5">
                <p className="font-arabic text-rmc-green-dark text-2xl md:text-3xl leading-loose px-2" dir="rtl">
                  {content.shahadaArabic}
                </p>
              </div>

              <p className="text-gray-600 text-sm md:text-base italic mb-2">{content.shahadaTransliteration}</p>
              <p className={`text-gray-500 text-sm leading-relaxed ${isAr ? 'font-arabic' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
                {pick(content.shahadaTranslation, locale)}
              </p>
            </div>
          </div>

          {/* Right — steps + completion prompt + what's next */}
          <div>
            <h3
              className={`text-lg md:text-xl font-bold text-gray-900 mb-6 ${isAr ? 'font-arabic' : ''}`}
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {pick(content.stepsHeading, locale)}
            </h3>

            <ol className="space-y-4">
              {content.steps.slice(0, 2).map((step, i) => (
                <StepCard key={i} step={step} index={i} locale={locale} isAr={isAr} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  locale,
  isAr,
}: {
  step: HowStep;
  index: number;
  locale: string;
  isAr: boolean;
}) {
  const { ref, visible } = useScrollReveal(0.1);
  const Icon = STEP_ICONS[step.icon] ?? Sparkles;

  return (
    <li ref={ref as React.MutableRefObject<HTMLLIElement | null>}>
      <a
        href={STEP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-500 hover:border-rmc-green/30 hover:shadow-lg ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <div className="shrink-0">
          <div className="relative w-12 h-12 rounded-xl bg-rmc-green-light flex items-center justify-center text-rmc-green group-hover:bg-rmc-green group-hover:text-white transition-colors">
            <Icon className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rmc-gold text-white text-xs font-bold flex items-center justify-center shadow">
              {index + 1}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1" dir={isAr ? 'rtl' : 'ltr'}>
          <h4 className={`font-bold text-gray-900 text-base mb-1 ${isAr ? 'font-arabic' : ''}`}>
            {pick(step.title, locale)}
          </h4>
          <p className={`text-gray-500 text-sm leading-relaxed ${isAr ? 'font-arabic' : ''}`}>
            {pick(step.description, locale)}
          </p>
        </div>

        <ExternalLink className="w-4 h-4 text-gray-300 shrink-0 transition-colors group-hover:text-rmc-green" aria-hidden="true" />
      </a>
    </li>
  );
}
