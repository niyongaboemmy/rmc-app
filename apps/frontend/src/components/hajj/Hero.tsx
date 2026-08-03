'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Compass } from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { HERO_IMAGE } from './data';
import {
  ContentKeys, pick, isRtl,
  HAJJ_DEFAULT, type HajjContent, type Locale,
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
 *
 * In super-admin Edit Mode the title, subtitle and Talbiyah meaning are editable
 * in place; everyone else gets the identical read-only markup. The Talbiyah
 * itself is scripture and stays out of it.
 */
export function Hero() {
  const locale = useLocale();
  const lang = locale as Locale;
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  // Same merged content as before (defaults, then whatever the CMS holds) —
  // plus the in-progress draft while an admin is editing.
  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );

  const hero = content.hero;

  return (
    <section className="relative flex min-h-[40vh] flex-col overflow-hidden text-white">
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

      <div className="relative flex flex-1 items-center justify-center px-6 pt-28 pb-10 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
        {/* Crest */}
        <div className="mb-4 flex justify-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <span className="absolute inset-0 rounded-lg bg-rmc-gold/20 blur-md" aria-hidden="true" />
            <Compass className="relative h-8 w-8 text-rmc-gold-light" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>

        {/* Talbiyah */}
        <p className="font-arabic text-xl leading-relaxed text-rmc-gold-light drop-shadow md:text-2xl" dir="rtl" lang="ar">
          {TALBIYAH}
        </p>
        {editing ? (
          <InlineText
            as="p"
            lang={locale}
            dir={dir}
            value={pick(hero.talbiyahMeaning, locale)}
            onCommit={(v) => setField((d) => { d.hero.talbiyahMeaning[lang] = v; })}
            className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45"
            placeholder="Meaning of the Talbiyah"
          />
        ) : (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
            {pick(hero.talbiyahMeaning, locale)}
          </p>
        )}

        {editing ? (
          <InlineText
            as="h1"
            lang={locale}
            dir={dir}
            value={pick(hero.title, locale)}
            onCommit={(v) => setField((d) => { d.hero.title[lang] = v; })}
            className="mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight drop-shadow-lg md:text-[2.75rem] md:leading-[1.1]"
            placeholder="Hero title"
          />
        ) : (
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight drop-shadow-lg md:text-[2.75rem] md:leading-[1.1]">
            {pick(hero.title, locale)}
          </h1>
        )}

        {editing ? (
          <InlineText
            as="p"
            lang={locale}
            dir={dir}
            value={pick(hero.subtitle, locale)}
            onCommit={(v) => setField((d) => { d.hero.subtitle[lang] = v; })}
            className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base"
            placeholder="Hero subtitle"
          />
        ) : (
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
            {pick(hero.subtitle, locale)}
          </p>
        )}
        </div>
      </div>

      <BackToServices locale={locale} />
    </section>
  );
}
