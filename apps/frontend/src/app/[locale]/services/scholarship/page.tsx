import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Search,
  FileText,
  User,
  MapPin,
  Users,
  Phone,
} from 'lucide-react';
import { ScholarshipProgramsList } from '@/components/services/scholarship/ScholarshipProgramsList';

const needIcons = {
  i1: User,
  i2: MapPin,
  i3: GraduationCap,
  i4: Users,
  i5: FileText,
} as const;
const needKeys = ['i1', 'i2', 'i3', 'i4', 'i5'] as const;
const stepKeys = ['s1', 's2', 's3', 's4'] as const;
const faqKeys = ['f1', 'f2', 'f3', 'f4'] as const;

export default async function ScholarshipServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.scholarship');

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
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80"
            alt="Scholarships"
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
                  <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{t('title')}</h1>
              <p className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed">{t('desc')}</p>
            </div>
          </div>

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
            GET STARTED — the two CTA cards
        =================================================================== */}
        <section className="pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
            <Link
              href={`/${locale}/services/scholarship/apply`}
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
              href={`/${locale}/services/scholarship/status`}
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

        {/* ===================================================================
            WHAT YOU'LL NEED — grounded in the actual application form fields
        =================================================================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-emerald-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{t('detail.needTitle')}</h2>
              <p className="text-white/60 text-sm max-w-xl mx-auto">{t('detail.needSubtitle')}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {needKeys.map((key) => {
                const Icon = needIcons[key];
                return (
                  <div key={key} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-600/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm mb-0.5">{t(`detail.need.${key}.title`)}</p>
                      <p className="text-white/60 text-xs leading-relaxed">{t(`detail.need.${key}.text`)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            AVAILABLE SCHOLARSHIPS — the actionable heart of the page
        =================================================================== */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50/80 pattern-light">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.programsTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('landing.programsSubtitle')}</p>
            </div>
            <ScholarshipProgramsList />
          </div>
        </section>

        {/* ===================================================================
            HOW IT WORKS — compact horizontal steps
        =================================================================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.processTitle')}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('detail.processSubtitle')}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stepKeys.map((key, i) => (
                <div key={key} className="relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold mb-3">
                    {i + 1}
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{t(`detail.steps.${key}.title`)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{t(`detail.steps.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            FAQ
        =================================================================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-emerald-50/40 pattern-light">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.faqTitle')}</h2>
            </div>
            <div className="space-y-3">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-emerald-200 transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                    {t(`detail.faqs.${key}.q`)}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 text-sm leading-relaxed mt-3">{t(`detail.faqs.${key}.a`)}</p>
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
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80"
            alt="Begin your scholarship application"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">{t('detail.ctaTitle')}</h2>
            <p className="text-white/60 mb-7 text-sm">{t('detail.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/scholarship/apply`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-emerald-900/40 transition-all duration-200 hover:scale-105 active:scale-100"
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
