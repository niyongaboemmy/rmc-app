import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LibraryPageClient } from '@/components/dawah/LibraryPageClient';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'dawah' });
  return {
    title: `${t('library.title')} — ${t('title')}`,
    description: t('library.subtitle'),
  };
}

/**
 * Thin shell. The listing is a client component: its filter state lives in the
 * URL and it owns the preview-overlay interaction, neither of which a Server
 * Component can hold.
 *
 * The Suspense boundary is REQUIRED — useSearchParams() forces a client render
 * boundary, and the production build fails without one (dev would let it slide).
 *
 * The listing's own copy (heading, subtitle, empty state) is admin-managed, so it is
 * read here and handed down — the client component then renders it in the first paint
 * instead of fetching it after hydration.
 */
export default async function LibraryPage() {
  const content = await fetchSiteContent([ContentKeys.library]);

  return (
    <SiteContentProvider content={content}>
      <Suspense>
        <LibraryPageClient />
      </Suspense>
    </SiteContentProvider>
  );
}
