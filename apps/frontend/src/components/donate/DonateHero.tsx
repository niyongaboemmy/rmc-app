'use client';

/**
 * Premium donate-page hero. Image-led, trust-forward: a bold appeal, a primary
 * "give" CTA that scrolls to the causes, and the niyyah (intention) selector kept
 * as elegant glass pills — the intention rides along with every donation, so it
 * stays a first-class, functional part of the flow. Copy is i18n (`donate.*`).
 */

import Image from 'next/image';
import { HeartHandshake, ArrowDown, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { niyyahFor, HERO_IMG } from './donateData';

export function DonateHero({
  niyyah,
  onNiyyah,
  currency = 'RWF',
}: {
  niyyah: string;
  onNiyyah: (key: string) => void;
  currency?: string;
}) {
  const t = useTranslations('donate');
  const options = niyyahFor(currency);

  return (
    <section className="relative overflow-hidden bg-rmc-green-deep">
      <Image src={HERO_IMG} alt="" fill priority sizes="100vw" className="object-cover object-center" />
      {/* Layered scrim: deep-green base + warm gold glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep via-rmc-green-deep/80 to-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(212,160,23,0.24),transparent_58%)]" />
      <div className="absolute inset-0 pattern-islamic opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-9 pt-16 text-center sm:px-8 md:pb-11 md:pt-16">
        <p className="mb-2.5 font-arabic text-base leading-loose text-rmc-gold-light drop-shadow md:text-xl" dir="rtl">
          وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
        </p>

        <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] text-white drop-shadow-lg md:text-5xl">
          {t('header.title1')}
          <span className="mt-1 block text-gradient-gold">{t('header.title2')}</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-[15px]">
          {t.rich('header.intro', { b: (c) => <span className="font-semibold text-white">{c}</span> })}
        </p>

        {/* Primary CTA */}
        <a
          href="#causes"
          className="group mt-6 inline-flex items-center gap-2.5 rounded-lg bg-rmc-gold px-7 py-3 text-sm font-bold text-rmc-green-deep shadow-xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-gold-light"
        >
          <HeartHandshake className="h-5 w-5" />
          {t('header.title2')}
          <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
        </a>

        {/* Niyyah — intention pills */}
        <div className="mt-7 w-full max-w-2xl">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-rmc-gold-light/90">
            <Sparkles className="h-3.5 w-3.5" /> {t('header.setIntention')}
          </p>
          <div
            className={`grid grid-cols-1 gap-2.5 ${options.length > 3 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}
          >
            {options.map((n) => {
              const active = niyyah === n.key;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => onNiyyah(n.key)}
                  aria-pressed={active}
                  className={`group rounded-lg border px-4 py-3.5 text-center backdrop-blur-md transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold ${
                    active
                      ? 'border-rmc-gold/70 bg-white/15 shadow-lg shadow-black/10 ring-1 ring-rmc-gold/40'
                      : 'border-white/15 bg-white/[0.06] hover:border-white/35 hover:bg-white/10'
                  }`}
                >
                  <span className="block font-arabic text-lg text-rmc-gold-light" dir="rtl">{n.ar}</span>
                  <span className="mt-1 block text-sm font-bold text-white">{t(`niyyah.${n.key}.label`)}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-white/60">{t(`niyyah.${n.key}.desc`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
