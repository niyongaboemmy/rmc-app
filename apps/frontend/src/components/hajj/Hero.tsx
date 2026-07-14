'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Compass } from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import { HERO_IMAGE } from './data';
import {
  ContentKeys, getSiteContent, mergeContent, pick,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';

/**
 * The Talbiyah — the pilgrim's call, recited throughout Hajj. Scripture, not
 * copy: deliberately not admin-editable.
 */
const TALBIYAH = 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ';

/**
 * Hajj hero — a deep navy/green gradient layered with a soft gold glow and a
 * subtle Islamic geometric pattern, opening with the Talbiyah for a sense of
 * spirituality and trust.
 *
 * Copy is admin-managed (Content → Hajj Service); the seeded defaults render
 * immediately, so there is no empty flash while the content loads.
 */
export function Hero() {
  const locale = useLocale();
  const [content, setContent] = useState<HajjContent>(HAJJ_DEFAULT);

  useEffect(() => {
    let active = true;
    getSiteContent<HajjContent>(ContentKeys.hajj)
      .then((data) => {
        if (active && data) setContent(mergeContent(HAJJ_DEFAULT, data));
      })
      .catch(() => { /* keep the defaults — a CMS outage must not blank the page */ });
    return () => { active = false; };
  }, []);

  const hero = content.hero;

  return (
    <section
      className="relative flex flex-col overflow-hidden text-white"
      style={{ minHeight: 'max(42vh, 320px)' }}
    >
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority
      />
      {/* Darkening wash so the Talbiyah and title stay legible over the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-navy/70 to-black/45" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-25" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" aria-hidden="true" />

      <div className="relative flex flex-1 items-center justify-center px-4 pt-32 pb-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
        {/* Crest */}
        <div className="mb-4 flex justify-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <span className="absolute inset-0 rounded-2xl bg-rmc-gold/20 blur-md" aria-hidden="true" />
            <Compass className="relative h-8 w-8 text-rmc-gold-light" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>

        {/* Talbiyah */}
        <p className="font-arabic text-xl leading-relaxed text-rmc-gold-light drop-shadow md:text-2xl" dir="rtl" lang="ar">
          {TALBIYAH}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
          {pick(hero.talbiyahMeaning, locale)}
        </p>

        {/* Ornamental divider */}
        <div className="my-4 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-14 bg-gradient-to-r from-transparent to-rmc-gold/60" />
          <span className="h-1.5 w-1.5 rotate-45 bg-rmc-gold/70" />
          <span className="h-px w-14 bg-gradient-to-l from-transparent to-rmc-gold/60" />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rmc-gold-light">
          {pick(hero.eyebrow, locale)}
        </p>
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight drop-shadow-lg md:text-[2.75rem] md:leading-[1.1]">
          {pick(hero.title, locale)}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
          {pick(hero.subtitle, locale)}
        </p>
        </div>
      </div>

      <BackToServices locale={locale} />
    </section>
  );
}
