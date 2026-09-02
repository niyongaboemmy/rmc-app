import { redirect } from 'next/navigation';

/**
 * Projects had TWO complete editors for the same data: this route and
 * /admin/content/projects, each ~500 lines, both writing ContentKeys.projects,
 * both covering all thirteen project fields. Nothing was broken by that, but a
 * field added to one, or a fix landing in one, would have been the whole problem.
 *
 * The Content one survives. It is built on the shared TriFields machinery that
 * every other content editor uses, where this was a bespoke implementation — and
 * it does not carry the `eyebrow` field this one still edited, which the public
 * page stopped rendering when the projects hero was centred and its badge
 * dropped. An editor for something nobody can see is worse than no editor.
 *
 * Kept as a redirect rather than deleted outright: this is the route the admin
 * sidebar pointed at for the life of the feature, so it is in bookmarks and in
 * people's fingers.
 */
export default function AdminProjectsRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/admin/content/projects`);
}
