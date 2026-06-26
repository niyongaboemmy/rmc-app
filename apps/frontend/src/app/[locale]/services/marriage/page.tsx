import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Users,
  CalendarCheck,
  ShieldCheck,
  BookOpenCheck,
  ScrollText,
  Phone,
  Building2,
  MapPin,
  Wallet,
  Search,
} from 'lucide-react';

// Icon per "what's included" item — copy comes from translations
const includeIcons = {
  nikah: BookOpenCheck,
  certificate: ScrollText,
  guidance: Users,
  witness: ShieldCheck,
} as const;
const includeKeys = ['nikah', 'certificate', 'guidance', 'witness'] as const;
const stepKeys = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;
const requirementKeys = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const;
const faqKeys = ['f1', 'f2', 'f3', 'f4'] as const;

export default async function MarriageServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.marriage');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ===================================================================
            HERO
        =================================================================== */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(42vh, 320px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
            alt="Islamic marriage celebration"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rose-950/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          {/* Centered hero content */}
          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-xl shadow-rose-900/50 ring-1 ring-white/20">
                  <Heart className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{t('title')}</h1>
              <p className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed">
                {t('desc')}
              </p>
            </div>
          </div>

          {/* Back button — bottom of hero, always visible */}
          <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
            <Link
              href={`/${locale}/services`}
              className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('detail.backToServices')}
            </Link>
          </div>
        </section>

        {/* ===================================================================
            OVERVIEW
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-7 lg:gap-10 items-center">
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80"
                  alt="Wedding rings"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/45 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -right-3 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2.5 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-sm">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-none">
                    {t('detail.certifiedBadge')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('detail.certifiedBadgeSub')}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                {t('detail.heroBadge')}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                {t('detail.overviewHeading')}{' '}
                <span className="text-rose-700">{t('detail.overviewHeadingHighlight')}</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-3 text-sm">{t('detail.overviewP1')}</p>
              <p className="text-gray-600 leading-relaxed mb-5 text-sm">{t('detail.overviewP2')}</p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href={`/${locale}/services/marriage/apply`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-rose-600 to-rose-800 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-rose-900/30 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                  {t('detail.startApplication')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/services/marriage/status`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-rose-200 text-rose-700 text-sm font-semibold rounded-full hover:border-rose-300 hover:bg-rose-50 transition-all duration-200"
                >
                  <Search className="w-4 h-4" /> {t('detail.checkStatus')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            WHAT'S INCLUDED
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-rose-50/40 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.includesTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">
                {t('detail.includesSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {includeKeys.map((key) => {
                const Icon = includeIcons[key];
                return (
                  <div
                    key={key}
                    className="group flex gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-sm ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.25} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">
                        {t(`detail.includes.${key}.title`)}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {t(`detail.includes.${key}.text`)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            PROCESS
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-7">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.processTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">
                {t('detail.processSubtitle')}
              </p>
            </div>

            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-rose-400 via-rose-200 to-transparent" />
              <div className="space-y-4">
                {stepKeys.map((key, i) => (
                  <div key={key} className="relative flex gap-5 items-start">
                    <div className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 text-white text-sm font-bold flex items-center justify-center shadow-md shadow-rose-900/25 ring-4 ring-white">
                      {i + 1}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">
                        {t(`detail.steps.${key}.title`)}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {t(`detail.steps.${key}.text`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            REQUIREMENTS
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50/80 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-5">
              <div className="md:col-span-2 bg-gradient-to-br from-rose-600 to-rose-800 p-6 text-white flex flex-col justify-center">
                <FileText className="w-8 h-8 mb-3 text-white/90" />
                <h2 className="text-xl font-bold mb-1.5">{t('detail.requirementsTitle')}</h2>
                <p className="text-white/80 text-sm leading-relaxed">
                  {t('detail.requirementsSubtitle')}
                </p>
              </div>
              <div className="md:col-span-3 p-6">
                <ul className="space-y-3">
                  {requirementKeys.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">
                        {t(`detail.requirements.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SERVICE FEES & PAYMENT CLAUSE
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-rose-50/40 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.fees.title')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('detail.fees.subtitle')}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {/* Mosque */}
              <div className="relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-sm ring-1 ring-white/20 mb-4">
                  <Building2 className="w-5 h-5 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{t('detail.fees.mosqueAmount')}</p>
                <p className="text-gray-500 text-sm mt-1.5">{t('detail.fees.mosqueLabel')}</p>
              </div>
              {/* Outside */}
              <div className="relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-sm ring-1 ring-white/20 mb-4">
                  <MapPin className="w-5 h-5 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{t('detail.fees.outsideAmount')}</p>
                <p className="text-gray-500 text-sm mt-1.5">{t('detail.fees.outsideLabel')}</p>
              </div>
            </div>

            {/* Payment clause */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <Wallet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 text-sm mb-1">
                  {t('detail.fees.clauseTitle')}
                </h3>
                <p className="text-amber-900/80 text-sm leading-relaxed">
                  {t('detail.fees.clause')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            FAQ
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.faqTitle')}</h2>
            </div>
            <div className="space-y-3">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-rose-200 transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                    {t(`detail.faqs.${key}.q`)}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 text-sm leading-relaxed mt-3">
                    {t(`detail.faqs.${key}.a`)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            CTA
        =================================================================== */}
        <section className="relative py-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=80"
            alt="Begin your marriage application"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">{t('detail.ctaTitle')}</h2>
            <p className="text-white/60 mb-7 text-sm">{t('detail.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/marriage/apply`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-rose-600 to-rose-800 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-rose-900/40 transition-all duration-200 hover:scale-105 active:scale-100"
              >
                {t('detail.ctaStart')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all duration-200"
              >
                <Phone className="w-4 h-4" /> {t('detail.ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
