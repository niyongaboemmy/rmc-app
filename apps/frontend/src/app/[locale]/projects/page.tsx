import { ProjectsListClient } from '@/components/projects/ProjectsListClient';

// Data is fetched client-side (same pattern as /donate) so the page always
// renders even when the backend isn't reachable from the server.
export default function ProjectsPage() {
  return <ProjectsListClient />;
}
