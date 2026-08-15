import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GraduationCap, ArrowLeft, ListOrdered } from 'lucide-react';
import { ScholarshipProgramsList } from '@/components/services/scholarship/ScholarshipProgramsList';
import { ScholarshipStatusCard } from '@/components/services/scholarship/ScholarshipStatusCard';
import {
  ScholarshipFaq,
  ScholarshipCta,
} from '@/components/services/scholarship/ScholarshipExtras';
import {
  BoardHeroCopy,
  BoardListHeader,
  BoardSteps,
  BoardStepsTitle,
} from '@/components/services/board/ServiceBoardCopy';
import { ContentKeys, SCHOLARSHIP_SERVICE_DEFAULT } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * The page's own copy is admin managed and inline-editable: hero, board header,
 * the four application steps, the FAQ and the closing CTA.
 *
 * The steps keep the tenders board's order — an applicant starts by BROWSING, and
 * signing in is incidental rather than a stage — but they are now entries in this
 * blob rather than fixed i18n keys, so an admin owns that sequence.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.scholarshipService];

export default async function ScholarshipServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [t, content] = await Promise.all([
    getTranslations('services.scholarship'),
    fetchSiteContent(PAGE_CONTENT_KEYS),
  ]);

  return (
    <SiteContentProvider content={content}>
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
                <BoardHeroCopy
                  sectionKey={ContentKeys.scholarshipService}
                  defaults={SCHOLARSHIP_SERVICE_DEFAULT}
                />
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
                  <BoardListHeader
                    sectionKey={ContentKeys.scholarshipService}
                    defaults={SCHOLARSHIP_SERVICE_DEFAULT}
                  />
                }
                railBottom={
                  <>
                    {/* How to apply */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-rmc-green" />
                        <BoardStepsTitle
                          sectionKey={ContentKeys.scholarshipService}
                          defaults={SCHOLARSHIP_SERVICE_DEFAULT}
                        />
                      </div>
                      <BoardSteps
                        sectionKey={ContentKeys.scholarshipService}
                        defaults={SCHOLARSHIP_SERVICE_DEFAULT}
                      />
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
            <ScholarshipFaq />
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
            <ScholarshipCta />
          </section>
        </main>
        <Footer />
      </div>
    </SiteContentProvider>
  );
}
