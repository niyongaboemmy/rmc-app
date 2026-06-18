'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  PARTNERS_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  isRtl,
  type PartnersContent,
  type PartnerItem,
} from '@/lib/content-api';

function PartnerCard({
  partner,
  sector,
  delay,
  visible,
}: {
  partner: PartnerItem;
  sector: string;
  delay: number;
  visible: boolean;
}) {
  const linked = Boolean(partner.website);

  const cardClass = `group relative flex h-full flex-col items-center rounded-3xl border border-gray-200/70 bg-white px-6 py-8 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.16)] transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_28px_60px_-24px_rgba(26,122,74,0.28)] ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  }`;

  const content = (
    <>
      {/* External-link hint — only for partners with a website */}
      {linked && (
        <span
          aria-hidden
          className="absolute right-3.5 top-3.5 grid place-items-center w-6 h-6 rounded-full bg-rmc-green/10 text-rmc-green opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
        >
          <ExternalLink className="w-3 h-3" />
        </span>
      )}

      {/* Logo — fixed box so every partner aligns regardless of aspect ratio */}
      <div className="relative flex h-20 w-full items-center justify-center md:h-24">
        <Image
          src={partner.logo}
          alt={`${partner.name} logo`}
          fill
          sizes="(max-width: 640px) 40vw, 220px"
          className="object-contain p-1 transition-transform duration-500 motion-reduce:transform-none group-hover:scale-105"
        />
      </div>

      {/* Name */}
      <p className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-900 transition-colors duration-200 group-hover:text-rmc-green">
        {partner.name}
      </p>

      {/* Sector */}
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">
        {sector}
      </p>
    </>
  );

  const ring =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  if (linked) {
    return (
      <a
        href={partner.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${partner.name} (opens in a new tab)`}
        className={`${cardClass} ${ring}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={cardClass} style={{ transitionDelay: `${delay}ms` }}>
      {content}
    </div>
  );
}

export function PartnersSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: gridRef, visible: gridVisible } = useScrollReveal(0.05);

  // Content managed from Admin → Content → Our Partners. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<PartnersContent>(PARTNERS_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<PartnersContent>(ContentKeys.partners)
      .then((data) => {
        if (active && data) setContent(mergeContent(PARTNERS_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const rtl = isRtl(locale);
  const fontClass = rtl ? 'font-arabic' : '';
  const dir = rtl ? 'rtl' : 'ltr';

  const eyebrow = pick(content.eyebrow, locale);
  const title = pick(content.title, locale);
  const lede = pick(content.lede, locale);
  const footerNote = pick(content.footerNote, locale);

  return (
    <section className="relative overflow-hidden bg-transparent py-12 md:py-16">
      {/* Light Islamic geometry + symmetric gold hairline seams */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-50" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />

      {/* Airy brand glow anchors */}
      <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rmc-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`mx-auto mb-14 max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <span
            dir={dir}
            className={`inline-flex items-center gap-2.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-green-dark backdrop-blur-sm ${fontClass}`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            {eyebrow}
          </span>

          <h2
            dir={dir}
            className={`mt-7 text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${fontClass}`}
          >
            <span className="text-rmc-green">{title}</span>
          </h2>

          <p
            dir={dir}
            className={`mx-auto mt-9 max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${fontClass}`}
          >
            {lede}
          </p>
        </div>

        {/* Partner logo wall */}
        <div ref={gridRef} className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
          {content.items.map((partner, i) => (
            <PartnerCard
              key={partner.name}
              partner={partner}
              sector={pick(partner.sector, locale)}
              delay={i * 90}
              visible={gridVisible}
            />
          ))}
        </div>

        {/* Footer note */}
        <p
          dir={dir}
          className={`mt-12 text-center text-sm text-gray-500 transition-all duration-700 delay-500 motion-reduce:transition-none ${fontClass} ${
            titleVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {footerNote}{' '}
          <a
            href={`mailto:${content.contactEmail}`}
            className="font-semibold text-rmc-green hover:underline"
          >
            {pick({ en: 'Get in touch', rw: 'Twandikire', ar: 'تواصل معنا' }, locale)}
          </a>
        </p>
      </div>
    </section>
  );
}
