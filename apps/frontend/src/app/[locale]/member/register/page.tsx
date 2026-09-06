import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';
import { RegisterForm } from './RegisterForm';

/**
 * Membership registration.
 *
 * The form itself is a client component — it is a long controlled form with
 * cascading location selects. This wrapper exists only to resolve its
 * admin-managed copy on the SERVER: the education levels are CMS content, and
 * `page-coverage.test.ts` requires a page's saved copy to be in the
 * server-rendered HTML rather than fetched after hydration. Without it the first
 * paint offers the built-in six and swaps in whatever RMC actually defined.
 *
 * The hero's own section comes from the locale layout's shared set, so it is not
 * repeated here; both fetches share one round-trip.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.memberRegistration];

export default async function MemberRegisterPage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <RegisterForm />
    </SiteContentProvider>
  );
}
