'use client';

/**
 * The donate page's opening statement — a warm, image-led hero with a clear
 * emotional headline and a prominent Donate call-to-action, so a visitor knows
 * instantly this is where you give. Copy comes from the i18n `donate.header`
 * namespace; the intention (niyyah) selector lives lower now, in its own compact
 * bar, so the hero stays focused on the ask.
 */

import Image from 'next/image';
import { HeartHandshake, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HERO_IMG } from './donateData';

export function DonateHero() {
  const t = useTranslations('donate');

  return (
    <section className="relative overflow-hidden bg-rmc-green-deep">
      <Image src={HERO_IMG} alt="" fill priority className="object-cover object-center" sizes="100vw" />
      {/* Warm layered scrim — deep green + gold glow for heart, not just contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep via-rmc-green-deep/75 to-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(212,160,23,0.22),transparent_55%)]" />
      <div className="absolute inset-0 pattern-islamic opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-14 pt-24 text-center sm:px-8 md:pb-16 md:pt-28">
        <p className="mb-3 font-arabic text-lg leading-loose text-rmc-gold-light drop-shadow md:text-2xl" dir="rtl">
          وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
        </p>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rmc-gold/30 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold-light backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> {t('header.setIntention')}
        </div>

        <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] text-white drop-shadow-lg md:text-6xl">
          {t('header.title1')}
          <span className="mt-1 block text-gradient-gold">{t('header.title2')}</span>
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
          {t.rich('header.intro', { b: (c) => <span className="font-semibold text-white">{c}</span> })}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#campaigns"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-rmc-gold px-8 py-3.5 text-sm font-bold text-rmc-green-deep shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-gold-light"
          >
            <HeartHandshake className="h-5 w-5" />
            {t('header.title2')}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
          </a>
          <a
            href="#give"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/10"
          >
            {t('quickGive.title')}
          </a>
        </div>
      </div>
    </section>
  );
}
