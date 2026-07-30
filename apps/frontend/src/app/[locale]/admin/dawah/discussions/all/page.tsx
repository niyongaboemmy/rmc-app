import { redirect } from 'next/navigation';

/**
 * The separate "all questions" list folded into the main Q&A library, which now shows
 * every status behind a filter. Kept as a redirect so bookmarks and any lingering nav
 * links land somewhere useful instead of 404ing.
 */
export default function AdminDiscussionsAllRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/admin/dawah/discussions`);
}
