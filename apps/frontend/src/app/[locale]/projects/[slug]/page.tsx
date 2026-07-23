import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';

// Data is fetched client-side (same pattern as /donate) so the page always
// renders even when the backend isn't reachable from the server.
export default function ProjectDetailPage({
  params: { slug },
}: {
  params: { locale: string; slug: string };
}) {
  return <ProjectDetailClient slug={slug} />;
}
