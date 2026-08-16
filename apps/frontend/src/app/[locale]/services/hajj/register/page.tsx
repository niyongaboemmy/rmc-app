import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HajjRegisterForm } from '@/components/hajj/HajjRegisterForm';
import { HajjPageHeading } from '@/components/hajj/HajjPageHeading';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/** The heading is admin-managed; the form's own fields stay in i18n. */
const PAGE_CONTENT_KEYS = [ContentKeys.hajj];

export default async function HajjRegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const [t, content] = await Promise.all([
    getTranslations('services.hajj.register'),
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
            <HajjPageHeading group="register" />
          </div>
        </section>

        <HajjRegisterForm />
      </main>
      <Footer />
    </div>
    </SiteContentProvider>
  );
}
