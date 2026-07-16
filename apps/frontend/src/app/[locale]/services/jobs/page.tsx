import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Briefcase, ArrowLeft, ArrowRight, FileText, Search,
  Users, GraduationCap, UserCheck, Building2, CheckCircle2, Phone,
} from 'lucide-react';
import { OpenPositions } from '@/components/services/jobs/OpenPositions';

// Copy for every card/step/faq lives in translations — these just drive the loops.
const whoIcons = { seekers: Briefcase, graduates: GraduationCap, professionals: UserCheck, community: Users } as const;
const whoKeys = ['seekers', 'graduates', 'professionals', 'community'] as const;
const stepKeys = ['s1', 's2', 's3', 's4', 's5'] as const;
const needKeys = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'] as const;
const faqKeys = ['f1', 'f2', 'f3', 'f4'] as const;

export default async function JobsServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.jobs');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ── Hero ── */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(42vh, 320px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
            alt="Job opportunities"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-emerald-950/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-xl shadow-emerald-900/50 ring-1 ring-white/20">
                  <Briefcase className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{t('landing.heroTitle')}</h1>
              <p className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed">{t('landing.heroSubtitle')}</p>
            </div>
          </div>

          <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
            <Link
              href={`/${locale}/services`}
              className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('landing.backToServices')}
            </Link>
          </div>
        </section>

        {/* ── CTA cards (apply / check status) ── */}
        <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
            <Link
              href={`/${locale}/services/jobs/apply`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="font-bold text-gray-900">{t('landing.applyTitle')}</p>
              <p className="text-sm text-gray-500 flex-1">{t('landing.applyText')}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-2.5 transition-all">
                {t('landing.applyCta')} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href={`/${locale}/services/jobs/status`}
              className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="font-bold text-gray-900">{t('landing.statusTitle')}</p>
              <p className="text-sm text-gray-500 flex-1">{t('landing.statusText')}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-2.5 transition-all">
                {t('landing.statusCta')} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── Current openings (admin-posted vacancies) ── */}
        <OpenPositions />

        {/* ── Who it's for ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.whoTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('landing.whoSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {whoKeys.map((key) => {
                const Icon = whoIcons[key];
                return (
                  <div
                    key={key}
                    className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm ring-1 ring-white/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.25} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{t(`landing.who.${key}.title`)}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{t(`landing.who.${key}.text`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How to apply (steps) ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-emerald-50/40 pattern-light">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-7">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.stepsTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('landing.stepsSubtitle')}</p>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400 via-emerald-200 to-transparent" />
              <div className="space-y-4">
                {stepKeys.map((key, i) => (
                  <div key={key} className="relative flex gap-5 items-start">
                    <div className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-bold flex items-center justify-center shadow-md shadow-emerald-900/25 ring-4 ring-white">
                      {i + 1}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{t(`landing.steps.${key}.title`)}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{t(`landing.steps.${key}.text`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── What you'll need (documents) ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-5">
              <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white flex flex-col justify-center">
                <FileText className="w-8 h-8 mb-3 text-white/90" />
                <h2 className="text-xl font-bold mb-1.5">{t('landing.needTitle')}</h2>
                <p className="text-white/80 text-sm leading-relaxed">{t('landing.needSubtitle')}</p>
              </div>
              <div className="md:col-span-3 p-6">
                <ul className="space-y-3">
                  {needKeys.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{t(`landing.need.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-emerald-50/40 pattern-light">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.faqTitle')}</h2>
            </div>
            <div className="space-y-3">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-emerald-200 transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                    {t(`landing.faqs.${key}.q`)}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 text-sm leading-relaxed mt-3">{t(`landing.faqs.${key}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="relative py-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
            alt="Start your job application"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">{t('landing.ctaTitle')}</h2>
            <p className="text-white/60 mb-7 text-sm">{t('landing.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/jobs/apply`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-emerald-900/40 transition-all duration-200 hover:scale-105 active:scale-100"
              >
                {t('landing.ctaStart')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all duration-200"
              >
                <Phone className="w-4 h-4" /> {t('landing.ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
