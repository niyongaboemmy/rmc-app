import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Briefcase,
  ArrowLeft,
  ListOrdered,
} from 'lucide-react';
import { TenderList } from '@/components/services/tender/TenderList';
import { TenderStatusCard } from '@/components/services/tender/TenderStatusCard';
import {
  BoardHeroCopy,
  BoardListHeader,
  BoardSteps,
  BoardStepsTitle,
} from '@/components/services/board/ServiceBoardCopy';
import { ContentKeys, TENDER_SERVICE_DEFAULT } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

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

/**
 * The page's own copy — hero, board header and the bidder's journey — is admin
 * managed and inline-editable. The steps used to be four hard-coded i18n keys; they
 * are now entries in this blob, so their order and wording are the admin's.
 *
 * `tender-service` is this page. The home page's tender teaser is `tenders-home`.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.tenderService];

export default async function TenderServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [t, content] = await Promise.all([
    getTranslations('services.tender'),
    fetchSiteContent(PAGE_CONTENT_KEYS),
  ]);

  return (
    <SiteContentProvider content={content}>
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
                <BoardHeroCopy
                  sectionKey={ContentKeys.tenderService}
                  defaults={TENDER_SERVICE_DEFAULT}
                />
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

          {/* Browse the tender board — description + filters in a left rail beside the list */}
          <section className="bg-gray-50/60 pattern-light py-14 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <TenderList
                variant="sidebar"
                listHeader={
                  <BoardListHeader
                    sectionKey={ContentKeys.tenderService}
                    defaults={TENDER_SERVICE_DEFAULT}
                  />
                }
                railBottom={
                  <>
                    {/* How to apply */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-rmc-green" />
                        <BoardStepsTitle
                          sectionKey={ContentKeys.tenderService}
                          defaults={TENDER_SERVICE_DEFAULT}
                        />
                      </div>
                      <BoardSteps
                        sectionKey={ContentKeys.tenderService}
                        defaults={TENDER_SERVICE_DEFAULT}
                      />
                    </div>

                    {/* Track an already-submitted bid — opens the checker in a modal */}
                    <TenderStatusCard />
                  </>
                }
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </SiteContentProvider>
  );
}
