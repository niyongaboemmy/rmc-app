import { notFound, redirect } from 'next/navigation';

/**
 * Legacy service-slug catcher.
 *
 * Every real service now has its own static route (marriage, funeral,
 * good-conduct, scholarship, hajj, tender, jobs), and Next.js matches those
 * static segments ahead of this dynamic one — so the old "Coming Soon" screen
 * for funeral/tender/jobs was unreachable dead code and has been removed.
 *
 * The one thing still needed here is bouncing the old `/services/conduct`
 * bookmark (there is no static `services/conduct` page) to the live Good
 * Conduct route. Anything else is a genuine 404.
 */
export default async function ServiceSlugRedirect({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  if (slug === 'conduct') redirect(`/${locale}/services/good-conduct`);
  notFound();
}
