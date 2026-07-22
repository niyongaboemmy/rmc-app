import { redirect } from 'next/navigation';

// The standalone /activities page was removed — its "Latest & Upcoming" content
// now lives on the home page and under /donate (donation programs). This redirect
// stub keeps old links alive (e.g. a hero CTA still pointing at /activities in
// saved content, or external bookmarks) so they never hit a 404.
export default function ActivitiesRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/donate`);
}
