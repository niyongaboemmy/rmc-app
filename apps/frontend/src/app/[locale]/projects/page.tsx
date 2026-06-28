import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Building2, Clock, Phone, Home } from 'lucide-react';

// Themed to the RMC brand. Image reuses an Unsplash URL already used elsewhere
// in the app (so the host is allow-listed for next/image).
const HERO_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80';

export default async function ProjectsComingSoonPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('projects');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(52vh, 420px)' }}
      >
        <Image src={HERO_IMAGE} alt={t('title')} fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-20" />

        {/* Centered hero content */}
        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-4 pb-4">
          <div className="max-w-2xl mx-auto">
            {/* Icon */}
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-black/30 ring-1 ring-white/20">
                <Building2 className="w-7 h-7 text-white" strokeWidth={1.75} />
              </div>
            </div>

            {/* Coming Soon badge */}
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-emerald-200 text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
                <Clock className="w-3 h-3" /> {t('badge')}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg mb-3">{t('title')}</h1>
            <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">{t('desc')}</p>
          </div>
        </div>

        {/* Back button — bottom of hero */}
        <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToHome')}
          </Link>
        </div>
      </section>

      {/* ── Coming Soon Body ── */}
      <main className="flex-1 bg-gray-50 pattern-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {/* ETA card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="h-1 bg-gradient-to-r from-rmc-green to-rmc-green-deep" />
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-md ring-1 ring-white/20">
                <Building2 className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {t('etaLabel')}
                </p>
                <p className="text-2xl font-bold text-rmc-green">{t('eta')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('etaDesc')}</p>
              </div>
              <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 border-rmc-green/20 bg-rmc-green-light/40 shrink-0">
                <Clock className="w-6 h-6 text-rmc-green mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-rmc-green">
                  {t('inProgress')}
                </span>
              </div>
            </div>
          </div>

          {/* What to expect */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">{t('whatToExpect')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{t('expectP1')}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{t('expectP2')}</p>
          </div>

          {/* Contact CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/${locale}/contact`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-deep text-white text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all"
            >
              <Phone className="w-4 h-4" /> {t('contactUs')}
            </Link>
            <Link
              href={`/${locale}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Home className="w-4 h-4" /> {t('backToHome')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
