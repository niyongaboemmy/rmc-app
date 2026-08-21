import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DiscussionsPageClient } from '@/components/dawah/DiscussionsPageClient';

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
 */
export default function DiscussionsPage() {
  return (
    <Suspense>
      <DiscussionsPageClient />
    </Suspense>
  );
}
