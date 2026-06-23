'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Heart, GraduationCap, Globe, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { fileUrl } from '@/lib/api';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  AREAS_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  isRtl,
  type AreasContent,
  type AreaItem,
} from '@/lib/content-api';

/** Lucide icon name → component. Falls back to Globe for unknown names. */
const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

function PillarCard({
  item,
  index,
  locale,
  delay,
}: {
  item: AreaItem;
  index: string;
  locale: string;
  delay: number;
}) {
  const { ref, visible } = useScrollReveal(0.12);
  const Icon = ICONS[item.icon] ?? Globe;
  const rtl = isRtl(locale);
  const arFont = locale === 'ar' ? 'font-arabic' : '';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none h-full ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
    <Link
      href={`/${locale}/areas/${item.slug}`}
      dir={rtl ? 'rtl' : 'ltr'}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-gray-200/70 bg-white p-7 lg:p-8 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.18)] transition-all duration-300 hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_28px_64px_-24px_rgba(26,122,74,0.3)] cursor-pointer"
    >
      {/* Ghosted index numeral — anchors the card. -webkit-text-stroke draws a hairline outline;
          a faint solid green fill is the cross-engine fallback so it never vanishes.
          One of the two hover events: it warms to gold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 right-5 select-none font-bold leading-none tracking-tighter text-rmc-green/10 text-[6rem] md:text-[7rem] [-webkit-text-stroke:1.5px_rgba(26,122,74,0.14)] [-webkit-text-fill-color:transparent] transition-all duration-500 group-hover:text-rmc-gold/30 group-hover:[-webkit-text-stroke-color:rgba(212,160,23,0.5)]"
      >
        {index}
      </span>

      {/* Icon tile or hero image */}
      {item.imageKey ? (
        <span className="relative block w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-1 ring-inset ring-rmc-gold/30 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(item.imageKey)} alt="" className="w-full h-full object-cover" aria-hidden />
        </span>
      ) : (
        <span className="relative grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
          <Icon className="w-8 h-8" />
        </span>
      )}

      {/* Always-visible gold pillar label + title — gold reads at rest, not only on hover */}
      <p className="relative mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold">
        Pillar {index}
      </p>
      <h3 className={`relative mt-1.5 text-xl font-bold text-gray-900 ${arFont}`}>
        {pick(item.title, locale)}
      </h3>

      {/* Gold hairline beneath the title — static, on-brand accent */}
      <span
        aria-hidden
        className="relative mt-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
      />

      {/* Description */}
      <p className={`relative mt-4 text-sm leading-relaxed text-gray-500 ${arFont}`}>
        {pick(item.description, locale)}
      </p>

      {/* "Learn more" cue */}
      <p className="relative mt-5 text-xs font-semibold text-rmc-green opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Learn more →
      </p>
    </Link>
    </div>
  );
}

export function AreasOfInterventionSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  // Content managed from Admin → Content → Areas of Intervention. Falls back to
  // the built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<AreasContent>(AREAS_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<AreasContent>(ContentKeys.areas)
      .then((data) => {
        if (active && data) setContent(mergeContent(AREAS_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const rtl = isRtl(locale);
  const arFont = locale === 'ar' ? 'font-arabic' : '';

  return (
    <section className="relative overflow-hidden bg-transparent py-12 md:py-16">
      {/* Light Islamic geometry + symmetric gold hairline seams to the darker neighbouring sections */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-60" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      {/* Airy brand glow anchors — subtle, never heavy */}
      <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rmc-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section header — light-styled echo of the hero / sibling-light eyebrow rhythm ── */}
        <div
          ref={titleRef}
          dir={rtl ? 'rtl' : 'ltr'}
          className={`mx-auto mb-16 max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          {/* Gold-dot eyebrow chip — matches the WhoWeAre light-section grammar exactly */}
          <span className={`inline-flex items-center gap-2.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-green-dark backdrop-blur-sm ${arFont}`}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            {pick(content.eyebrow, locale)}
          </span>

          {/* Heading keyword carries the canonical brand .title-underline (green→gold→green bar) —
              the single strongest brand echo. No second rule stacked directly beneath it. */}
          <h2 className={`mt-7 text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}>
            {pick(content.title, locale)} <span className="text-rmc-green">{pick(content.titleAccent, locale)}</span>
          </h2>

          {/* One ornament rule below the lede — keeps the gold rhythm without competing with the
              animated underline directly under the H2. */}
          <div className="ornament-divider mx-auto mt-10 mb-6 max-w-xs" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
          </div>

          <p className={`mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${arFont}`}>
            {pick(content.lede, locale)}
          </p>
        </div>

        {/* ── Numbered pillar showcase ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((item, i) => (
            <PillarCard
              key={i}
              item={item}
              index={String(i + 1).padStart(2, '0')}
              locale={locale}
              delay={i * 110}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
