import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * The project itself is still fetched client-side (same pattern as /donate) so the
 * page always renders even when the backend isn't reachable from the server. Only the
 * shared admin-managed copy — the labels and headings around the project — moves to
 * the server; `fetchSiteContent` never throws, so that keeps the same guarantee.
 */
export default async function ProjectDetailPage({
  params: { slug },
}: {
  params: { locale: string; slug: string };
}) {
  const content = await fetchSiteContent([ContentKeys.projects]);

  return (
    <SiteContentProvider content={content}>
      <ProjectDetailClient slug={slug} />
    </SiteContentProvider>
  );
}
