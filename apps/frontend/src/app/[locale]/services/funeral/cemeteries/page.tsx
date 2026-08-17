import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Landmark } from 'lucide-react';
import { HeroBackLink } from '@/components/services/HeroBackLink';
import { HERO_IMAGE } from '@/components/funeral/data';
import { FuneralCallBar } from '@/components/funeral/FuneralCallBar';
import { CemeteryPageHeading } from '@/components/funeral/FuneralPageCopy';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/** The page heading, the empty state and the call bar's copy. */
const PAGE_CONTENT_KEYS = [ContentKeys.funeral];
import { CemeteryDirectory } from '@/components/funeral/CemeteryDirectory';

export default async function FuneralCemeteriesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [t, content] = await Promise.all([
    getTranslations('services.funeral.cemeteryPage'),
    fetchSiteContent(PAGE_CONTENT_KEYS),
  ]);

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen">
        <Navbar />
        <main className="bg-gray-50/60 pattern-light">
          {/* Header */}
          <section className="relative overflow-hidden text-white">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/70 to-black/45" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-25" aria-hidden="true" />
            <div className="relative mx-auto max-w-6xl px-4 pt-28 pb-4 text-center sm:px-6">
              <div className="mb-4 flex justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Landmark className="h-6 w-6 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
              <CemeteryPageHeading />
            </div>

            <HeroBackLink href={`/${locale}/services/funeral`} label={t('back')} />
          </section>

          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <CemeteryDirectory locale={locale} />
          </div>
        </main>
        <Footer />
        <FuneralCallBar />
    </div>
    </SiteContentProvider>
  );
}
