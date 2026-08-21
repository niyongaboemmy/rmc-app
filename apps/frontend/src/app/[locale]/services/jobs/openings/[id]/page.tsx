import JobOpeningDetailClient from '@/components/services/jobs/JobOpeningDetailClient';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * A single job opening. The posting itself is fetched client-side by the component
 * below — same as the listing, so the page renders even when the backend is not
 * reachable from the server.
 *
 * The page's own copy (section headings, the closing CTA, the not-found and closed
 * notices) lives in the `jobs-service` blob's `detail` group and is read here, so it
 * is in the server-rendered HTML rather than swapped in after hydration.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.jobsService];

export default async function JobOpeningDetailPage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <JobOpeningDetailClient />
    </SiteContentProvider>
  );
}
