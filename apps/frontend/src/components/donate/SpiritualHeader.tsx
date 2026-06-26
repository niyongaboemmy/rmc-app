'use client';

import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NIYYAH, HERO_IMG } from './donateData';

/* The opening "set the tone" section: a calm patterned hero with the
   Niyyah (intention) selector the donor sets before choosing a cause. */
export function SpiritualHeader({
  niyyah,
  onNiyyah,
}: {
  niyyah: string;
  onNiyyah: (key: string) => void;
}) {
  const t = useTranslations('donate');

  return (
    <section className="relative overflow-hidden bg-rmc-green-deep">
      <Image src={HERO_IMG} alt="" fill priority className="object-cover object-center" sizes="100vw" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep via-black/35 to-black/40" />
      <div className="absolute inset-0 pattern-islamic opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-28 pb-16 text-center sm:px-8 lg:px-12">
        <div className="animate-fade-up">
          <p className="mb-3 font-arabic text-lg leading-loose text-rmc-gold-light drop-shadow md:text-xl" dir="rtl">
            وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl">
            {t('header.title1')}
            <span className="block text-gradient-gold">{t('header.title2')}</span>
          </h1>
          <p className="w-full text-sm leading-relaxed text-white/75 md:text-base">
            {t.rich('header.intro', { b: (c) => <span className="font-semibold text-white">{c}</span> })}
          </p>
        </div>

        {/* Niyyah selector */}
        <div className="mt-8 animate-fade-up delay-100">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rmc-gold-light/90">
            <Sparkles className="h-3.5 w-3.5" />
            {t('header.setIntention')}
          </p>
          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
            {NIYYAH.map((n) => {
              const active = niyyah === n.key;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => onNiyyah(n.key)}
                  aria-pressed={active}
                  className={`group rounded-2xl border px-3 py-3.5 text-center backdrop-blur transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold ${
                    active
                      ? 'border-rmc-gold bg-white/15 ring-1 ring-rmc-gold/40'
                      : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <span className="block font-arabic text-base text-rmc-gold-light" dir="rtl">{n.ar}</span>
                  <span className="mt-0.5 block text-sm font-bold text-white">{t(`niyyah.${n.key}.label`)}</span>
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
