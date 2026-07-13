import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Moon,
  ArrowRight,
  FileText,
  Landmark,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';
import { FuneralActionCard } from '@/components/funeral/FuneralActionCard';
import { FuneralTransportsSection } from '@/components/funeral/FuneralTransportsSection';
import { HERO_AYAH, HERO_IMAGE } from '@/components/funeral/data';

type Tone = 'green' | 'gold' | 'slate';

export default async function FuneralServicesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.funeral');
  const base = `/${locale}/services/funeral`;

  // Quick-action cards.
  const actions: { key: string; icon: LucideIcon; href: string; tone: Tone }[] = [
    { key: 'report', icon: FileText, href: `${base}/request`, tone: 'green' },
    { key: 'cemetery', icon: Landmark, href: `${base}/cemeteries`, tone: 'slate' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ── Hero ── */}
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
          {/* Darkening wash so the ayah and title stay legible over the photo. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-slate-950/70 to-black/45" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-25" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" aria-hidden="true" />

          <div className="relative flex flex-1 items-center justify-center px-4 pt-32 pb-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Moon className="h-7 w-7 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
              </span>
            </div>
            <p className="mb-1.5 font-arabic text-xl leading-relaxed text-rmc-gold-light drop-shadow md:text-2xl" dir="rtl" lang="ar">
              {HERO_AYAH}
            </p>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-white/50">
              {t('landing.ayahRef')}
            </p>
            <h1 className="mb-2 text-3xl font-bold drop-shadow-lg md:text-4xl">{t('title')}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">{t('desc')}</p>
            </div>
          </div>

          <BackToServices locale={locale} />
        </section>

        {/* ── Quick actions + stats ── */}
        <section className="relative bg-transparent py-12">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900">{t('landing.quickTitle')}</h2>
              <p className="mt-2 text-sm text-gray-500">{t('landing.quickSub')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {actions.map((a) => (
                <FuneralActionCard
                  key={a.key}
                  href={a.href}
                  icon={a.icon}
                  tone={a.tone}
                  title={t(`landing.actions.${a.key}.title`)}
                  desc={t(`landing.actions.${a.key}.desc`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Available transport means (grouped by mosque) ── */}
        <FuneralTransportsSection />

        {/* ── Closing CTA ── */}
        <section className="relative overflow-hidden bg-rmc-green-deep py-14 text-center text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-15" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-3 text-2xl font-bold">{t('landing.ctaTitle')}</h2>
            <p className="mb-7 text-sm leading-relaxed text-white/60">{t('landing.ctaSub')}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`${base}/request`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-300 hover:bg-rmc-green-dark"
              >
                {t('landing.ctaReport')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/20"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {t('landing.ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
