import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DiscussionsPageClient } from '@/components/dawah/DiscussionsPageClient';
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
    title: `${t('discussions.title')} — ${t('title')}`,
    description: t('discussions.subtitle'),
  };
}

/**
 * Thin shell, exactly like the Library and Courses listings. The listing is a client
 * component: its filter state lives in the URL.
 *
 * The Suspense boundary is REQUIRED — useSearchParams() forces a client render boundary
 * and the production build fails without one (dev would let it slide, which is how this
 * gets missed).
 *
 * The listing's own copy (heading, subtitle, empty state) is admin-managed, so it is
 * read here and handed down — the client component then renders it in the first paint
 * instead of fetching it after hydration.
 */
export default async function DiscussionsPage() {
  const content = await fetchSiteContent([ContentKeys.discussions]);

  return (
    <SiteContentProvider content={content}>
      <Suspense>
        <DiscussionsPageClient />
      </Suspense>
    </SiteContentProvider>
  );
}
