import { Suspense } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HajjStatusChecker } from '@/components/hajj/HajjStatusChecker';
import { HajjPageHeading } from '@/components/hajj/HajjPageHeading';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/** The heading is admin-managed; the checker's own labels stay in i18n. */
const PAGE_CONTENT_KEYS = [ContentKeys.hajj];

export default async function HajjStatusPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [t, content] = await Promise.all([
    getTranslations('services.hajj.status'),
    fetchSiteContent(PAGE_CONTENT_KEYS),
  ]);

  return (
    <SiteContentProvider content={content}>
    <div className="min-h-screen">
      {/* Solid navbar: the image hero is gone, so a transparent bar would put
          white links on the light page and read as invisible. */}
      <Navbar solid />
      <main className="bg-gray-50/60 pattern-light">
        {/* Compact header — back link + title + subtitle; pt clears the navbar. */}
        <section className="pt-24 md:pt-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Link
              href={`/${locale}/services/hajj`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {t('back')}
            </Link>
            <HajjPageHeading group="status" />
          </div>
        </section>

        {/* useSearchParams() needs a Suspense boundary in the app router. */}
        <Suspense fallback={null}>
          <HajjStatusChecker />
        </Suspense>
      </main>
      <Footer />
    </div>
    </SiteContentProvider>
  );
}
