import TenderDetailClient from '@/components/tenders/TenderDetailClient';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * A single tender. The tender itself is fetched client-side by the component below —
 * same as the board, so the page renders even when the backend is not reachable from
 * the server.
 *
 * The page's own copy (hero, section headings, the closing CTA and the not-found
 * state) lives in the `tender-service` blob's `detail` group and is read here, so it
 * is in the server-rendered HTML rather than swapped in after hydration.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.tenderService];

export default async function TenderDetailPage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <TenderDetailClient />
    </SiteContentProvider>
  );
}
