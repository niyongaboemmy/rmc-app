import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Briefcase, ArrowLeft, ListOrdered } from 'lucide-react';
import { JobList } from '@/components/services/jobs/JobList';
import { JobsTrackByNumber } from '@/components/services/jobs/JobsTrackByNumber';

/**
 * Jobs service landing page — mirrors the Tenders board (`/services/tender`): a
 * hero, then a two-column browse section with the openings list on the left and
 * a rail (search, how-to-apply, status check) on the right, so the two services
 * feel identical.
 *
 * Tailwind classes are spelled out in full rather than interpolated, so the JIT
 * compiler can see them.
 */

/** The applicant's journey, in the order the flow actually walks them through it. */
const STEP_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;

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
        {/* Hero */}
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
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
              className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/25 hover:border-white/50 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('landing.backToServices')}
            </Link>
          </div>
        </section>

        {/* Browse the jobs board — list on the left, rail on the right */}
        <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <JobList
              variant="sidebar"
              listHeader={
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('landing.browseTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t('landing.browseNote')}</p>
                </div>
              }
              railBottom={
                <>
                  {/* How to apply */}
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-rmc-green" />
                      <h3 className="text-sm font-bold text-gray-900">{t('landing.stepsTitle')}</h3>
                    </div>
                    <ol className="space-y-3">
                      {STEP_KEYS.map((key, i) => (
                        <li key={key} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{t(`landing.steps.${key}.title`)}</p>
                            <p className="text-xs leading-relaxed text-gray-500">{t(`landing.steps.${key}.text`)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Track an already-submitted application */}
                  <JobsTrackByNumber />
                </>
              }
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
