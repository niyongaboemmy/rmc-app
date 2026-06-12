import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Heart, ArrowRight, ArrowLeft, CheckCircle2, FileText, Users,
  CalendarCheck, ShieldCheck, BookOpenCheck, ScrollText, Phone,
  Building2, MapPin, Wallet, Search,
} from 'lucide-react';

// Icon per "what's included" item — copy comes from translations
const includeIcons = {
  nikah: BookOpenCheck,
  certificate: ScrollText,
  guidance: Users,
  witness: ShieldCheck,
} as const;
const includeKeys = ['nikah', 'certificate', 'guidance', 'witness'] as const;
const stepKeys = ['s1', 's2', 's3', 's4', 's5'] as const;
const requirementKeys = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const;
const faqKeys = ['f1', 'f2', 'f3', 'f4'] as const;

export default async function MarriageServicePage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('services.marriage');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ===================================================================
            HERO
        =================================================================== */}
        <section className="relative text-white py-36 px-4 overflow-hidden min-h-[420px] flex items-center">
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
            alt="Islamic marriage celebration"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rose-950/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />
          <div className="relative max-w-4xl mx-auto text-center w-full">
            <Link
              href={`/${locale}/services`}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t('detail.backToServices')}
            </Link>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-lg shadow-rose-900/40 ring-1 ring-white/20">
                <Heart className="w-8 h-8 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{t('title')}</h1>
            <p className="text-white/75 text-lg max-w-2xl mx-auto">{t('desc')}</p>
          </div>
        </section>

        {/* ===================================================================
            OVERVIEW
        =================================================================== */}
        <section className="py-20 px-4 bg-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80"
                  alt="Wedding rings"
                  fill
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/45 to-transparent" />
              </div>
              <div className="absolute -bottom-5 -right-4 bg-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 border border-rose-100">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-md shadow-rose-900/25">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-none">{t('detail.certifiedBadge')}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('detail.certifiedBadgeSub')}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                {t('detail.heroBadge')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5">
                {t('detail.overviewHeading')} <span className="text-rose-700">{t('detail.overviewHeadingHighlight')}</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">{t('detail.overviewP1')}</p>
              <p className="text-gray-600 leading-relaxed mb-7 text-sm md:text-base">{t('detail.overviewP2')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/${locale}/services/marriage/apply`}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-br from-rose-600 to-rose-800 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-rose-900/30 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                  {t('detail.startApplication')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/services/marriage/status`}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white border-2 border-rose-200 text-rose-700 font-semibold rounded-full hover:border-rose-400 hover:bg-rose-50 transition-all duration-200"
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
        <section className="py-20 px-4 bg-rose-50/40 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('detail.includesTitle')}</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">{t('detail.includesSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {includeKeys.map((key) => {
                const Icon = includeIcons[key];
                return (
                  <div
                    key={key}
                    className="group flex gap-5 bg-white border-2 border-rose-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-rose-300 hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-md shadow-rose-900/25 ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-200">
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1.5">{t(`detail.includes.${key}.title`)}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{t(`detail.includes.${key}.text`)}</p>
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
        <section className="py-20 px-4 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('detail.processTitle')}</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">{t('detail.processSubtitle')}</p>
            </div>

            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-rose-400 via-rose-200 to-transparent" />
              <div className="space-y-8">
                {stepKeys.map((key, i) => (
                  <div key={key} className="relative flex gap-6 items-start">
                    <div className="relative z-10 w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 text-white font-bold flex items-center justify-center shadow-md shadow-rose-900/25 ring-4 ring-white">
                      {i + 1}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200 flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{t(`detail.steps.${key}.title`)}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{t(`detail.steps.${key}.text`)}</p>
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
        <section className="py-20 px-4 bg-gray-50/80 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-md overflow-hidden grid md:grid-cols-5">
              <div className="md:col-span-2 bg-gradient-to-br from-rose-600 to-rose-800 p-8 text-white flex flex-col justify-center">
                <FileText className="w-10 h-10 mb-4 text-white/90" />
                <h2 className="text-2xl font-bold mb-2">{t('detail.requirementsTitle')}</h2>
                <p className="text-white/80 text-sm leading-relaxed">{t('detail.requirementsSubtitle')}</p>
              </div>
              <div className="md:col-span-3 p-8">
                <ul className="space-y-4">
                  {requirementKeys.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm md:text-base">{t(`detail.requirements.${key}`)}</span>
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
        <section className="py-20 px-4 bg-rose-50/40 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('detail.fees.title')}</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">{t('detail.fees.subtitle')}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {/* Mosque */}
              <div className="relative bg-white border-2 border-rose-200 rounded-2xl p-7 shadow-sm overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-md shadow-rose-900/25 ring-1 ring-white/20 mb-5">
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{t('detail.fees.mosqueAmount')}</p>
                <p className="text-gray-500 text-sm mt-2">{t('detail.fees.mosqueLabel')}</p>
              </div>
              {/* Outside */}
              <div className="relative bg-white border-2 border-gray-200 rounded-2xl p-7 shadow-sm overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md shadow-slate-900/20 ring-1 ring-white/20 mb-5">
                  <MapPin className="w-6 h-6 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{t('detail.fees.outsideAmount')}</p>
                <p className="text-gray-500 text-sm mt-2">{t('detail.fees.outsideLabel')}</p>
              </div>
            </div>

            {/* Payment clause */}
            <div className="flex gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <Wallet className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 mb-1.5">{t('detail.fees.clauseTitle')}</h3>
                <p className="text-amber-900/80 text-sm leading-relaxed">{t('detail.fees.clause')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            FAQ
        =================================================================== */}
        <section className="py-20 px-4 bg-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('detail.faqTitle')}</h2>
            </div>
            <div className="space-y-4">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-rose-200 transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900">
                    {t(`detail.faqs.${key}.q`)}
                    <span className="w-7 h-7 shrink-0 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center text-lg leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 text-sm leading-relaxed mt-4">{t(`detail.faqs.${key}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            CTA
        =================================================================== */}
        <section className="relative py-20 px-4 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=80"
            alt="Begin your marriage application"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">{t('detail.ctaTitle')}</h2>
            <p className="text-white/60 mb-10 text-base">{t('detail.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/services/marriage/apply`}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-br from-rose-600 to-rose-800 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-rose-900/40 transition-all duration-200 hover:scale-105 active:scale-100"
              >
                {t('detail.ctaStart')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white/10 border border-white/25 text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-200"
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
