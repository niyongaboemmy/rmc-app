import MarriageLanding from '@/components/services/marriage/MarriageLanding';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * Marriage services landing. Every string on it is admin-managed, so the page is a
 * thin server shell: it reads the section here — putting the saved copy in the
 * first paint rather than a beat after hydration — and the client component below
 * owns the layout and the in-place editors.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.marriage];

export default async function MarriageServicePage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <MarriageLanding />
    </SiteContentProvider>
  );
}
