import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CoursesPageClient } from '@/components/dawah/CoursesPageClient';
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
    title: `${t('courses.title')} — ${t('title')}`,
    description: t('courses.subtitle'),
  };
}

/**
 * Thin shell. The listing itself is a client component: its filter state lives
 * in the URL and is edited interactively, which is not something a Server
 * Component can own.
 *
 * The Suspense boundary is REQUIRED, not decorative — useSearchParams() forces
 * the nearest boundary to client-render, and without one Next fails the
 * production build with "useSearchParams() should be wrapped in a suspense
 * boundary". `dev` would have let it through.
 *
 * The listing's own copy (heading, subtitle, empty state) is admin-managed, so it is
 * read here and handed down — the client component then renders it in the first paint
 * instead of fetching it after hydration.
 */
export default async function CoursesPage() {
  const content = await fetchSiteContent([ContentKeys.courses]);

  return (
    <SiteContentProvider content={content}>
      <Suspense>
        <CoursesPageClient />
      </Suspense>
    </SiteContentProvider>
  );
}
