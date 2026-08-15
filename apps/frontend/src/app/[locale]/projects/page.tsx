import { ProjectsListClient } from '@/components/projects/ProjectsListClient';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * The project LIST is still fetched client-side (same pattern as /donate) so the page
 * always renders even when the backend isn't reachable from the server. Only the
 * page's admin-managed copy — heading, subtitle, the labels around each card — moves
 * to the server, which is safe for the same reason: `fetchSiteContent` never throws,
 * it resolves to `{}` and the section keeps its built-in defaults.
 */
export default async function ProjectsPage() {
  const content = await fetchSiteContent([ContentKeys.projects]);

  return (
    <SiteContentProvider content={content}>
      <ProjectsListClient />
    </SiteContentProvider>
  );
}
