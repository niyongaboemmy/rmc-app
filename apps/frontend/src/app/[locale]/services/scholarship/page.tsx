import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  ListOrdered,
  Phone,
} from 'lucide-react';
import { ScholarshipProgramsList } from '@/components/services/scholarship/ScholarshipProgramsList';
import { ScholarshipStatusCard } from '@/components/services/scholarship/ScholarshipStatusCard';

/**
 * The same four steps, in the same order, as the tenders board
 * (`services.tender.landing.steps`). Semantic keys rather than s1..s4 so the two
 * services can be read side by side and neither drifts silently.
 *
 * Step one is BROWSE, not "sign in": under the opportunity flow an applicant
 * starts by finding a scholarship, and signing in is incidental to that rather
 * than a stage of the process.
 */
const stepKeys = ['browse', 'form', 'documents', 'track'] as const;
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
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
              className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/25 hover:border-white/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('detail.backToServices')}
            </Link>
          </div>
        </section>

        {/* ===================================================================
            BROWSE — the list beside a sticky rail.

            One section instead of four. This is the tenders board's shape
            (TenderList variant="sidebar"): the scholarships themselves own the
            page, and everything that used to be a full-width section of its own
            — how to apply, what to prepare, track an application — sits in the
            rail beside them, where it stays in view while the reader scrolls
            the list rather than being scrolled past once.
        =================================================================== */}
        <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <ScholarshipProgramsList
              variant="sidebar"
              listHeader={
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('landing.programsTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    {t('landing.programsSubtitle')}
                  </p>
                </div>
              }
              railBottom={
                <>
                  {/* How to apply */}
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-rmc-green" />
                      <h3 className="text-sm font-bold text-gray-900">{t('detail.processTitle')}</h3>
                    </div>
                    <ol className="space-y-3">
                      {stepKeys.map((key, i) => (
                        <li key={key} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{t(`detail.steps.${key}.title`)}</p>
                            <p className="text-xs leading-relaxed text-gray-500">{t(`detail.steps.${key}.text`)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* "What you'll need" lives on the scholarship's own page now.
                      It is preparation for ONE application, so it belongs beside
                      that scholarship's eligibility and deadline rather than
                      beside a list the reader is still choosing from. */}

                  {/* Track an application already submitted */}
                  <ScholarshipStatusCard locale={locale} />
                </>
              }
            />
          </div>
        </section>

        {/* ===================================================================
            FAQ
        =================================================================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-rmc-green-light/40 pattern-light">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('detail.faqTitle')}</h2>
            </div>
            <div className="space-y-3">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-rmc-green transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                    {t(`detail.faqs.${key}.q`)}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-rmc-green-light text-rmc-green-dark flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
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
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">{t('detail.ctaTitle')}</h2>
            <p className="text-white/60 mb-7 text-sm">{t('detail.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/scholarship/apply`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-rmc-green-dark/40 transition-all duration-200 hover:scale-105 active:scale-100"
              >
                {t('detail.ctaStart')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
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
