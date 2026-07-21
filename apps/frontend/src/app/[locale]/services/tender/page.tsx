import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Briefcase,
  ArrowLeft,
  ArrowRight,
  FileText,
  Search,
  CheckCircle2,
  ListChecks,
  ListOrdered,
} from 'lucide-react';

/**
 * Tender service landing page — teal accent throughout, matching the `tender`
 * entry in the services registry.
 *
 * This static route shadows the dynamic `services/[slug]` "coming soon" page,
 * which is why the tender redirect was removed from there.
 *
 * Tailwind classes are spelled out in full rather than interpolated, so the JIT
 * compiler can see them (the same rule the services registry calls out).
 */

/** The three documents every bid must carry — mirrors REQUIRED_DOCUMENTS on the client and the DB CHECK constraint. */
const REQUIREMENT_KEYS = ['rdb', 'tax', 'proposal', 'company', 'deadline'] as const;

/** The bidder's journey, in the order the wizard actually walks them through it. */
const STEP_KEYS = ['browse', 'form', 'documents', 'track'] as const;

export default async function TenderServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.tender');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(42vh, 320px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80"
            alt="RMC Tenders"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
                  <Briefcase className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{t('title')}</h1>
              <p className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed">
                {t('desc')}
              </p>
            </div>
          </div>

          <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
            <Link
              href={`/${locale}/services`}
              className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/25 hover:border-white/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('landing.backToServices')}
            </Link>
          </div>
        </section>

        <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* CTA cards */}
            <div className="grid sm:grid-cols-2 gap-5">
              <Link
                href={`/${locale}/services/tender/apply`}
                className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                  <FileText className="w-5 h-5 text-rmc-green-dark" />
                </div>
                <p className="font-bold text-gray-900">{t('landing.applyTitle')}</p>
                <p className="text-sm text-gray-500 flex-1">{t('landing.applyText')}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green group-hover:gap-2.5 transition-all">
                  {t('landing.applyCta')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link
                href={`/${locale}/services/tender/status`}
                className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center">
                  <Search className="w-5 h-5 text-rmc-green-dark" />
                </div>
                <p className="font-bold text-gray-900">{t('landing.statusTitle')}</p>
                <p className="text-sm text-gray-500 flex-1">{t('landing.statusText')}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green group-hover:gap-2.5 transition-all">
                  {t('landing.statusCta')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {/* How to apply — the four steps, in wizard order */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <ListOrdered className="w-5 h-5 text-rmc-green" />
                <h2 className="font-bold text-gray-900">{t('landing.stepsTitle')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">{t('landing.stepsSubtitle')}</p>

              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STEP_KEYS.map((key, i) => (
                  <li
                    key={key}
                    className="relative rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex flex-col gap-2"
                  >
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-bold flex items-center justify-center shadow-md shadow-rmc-green-dark/10">
                      {i + 1}
                    </span>
                    <p className="font-semibold text-gray-900 text-sm">
                      {t(`landing.steps.${key}.title`)}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {t(`landing.steps.${key}.text`)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Requirements checklist — static copy, deliberately not fetched */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-1">
                <ListChecks className="w-5 h-5 text-rmc-green" />
                <h2 className="font-bold text-gray-900">{t('landing.requirementsTitle')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">{t('landing.requirementsSubtitle')}</p>

              <ul className="space-y-4">
                {REQUIREMENT_KEYS.map((key) => (
                  <li key={key} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-rmc-green shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t(`landing.requirements.${key}.title`)}
                      </p>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {t(`landing.requirements.${key}.text`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Link out to the existing tenders board */}
            <div className="rounded-2xl bg-rmc-green-deep text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 shadow-lg ring-1 ring-white/10">
              <div className="flex-1">
                <p className="font-bold text-lg">{t('landing.boardTitle')}</p>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">
                  {t('landing.boardText')}
                </p>
              </div>
              <Link
                href={`/${locale}/tenders`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-rmc-green-dark text-sm font-semibold hover:bg-rmc-green-light transition-colors shrink-0"
              >
                {t('landing.boardCta')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
