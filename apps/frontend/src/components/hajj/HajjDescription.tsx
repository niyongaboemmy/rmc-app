import { getLocale } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { mergeContent, pick, HAJJ_DEFAULT } from '@/lib/content-api';
import { HajjDescriptionSection } from './HajjDescriptionSection';

/**
 * Section: the descriptive block between the About section and the requirements
 * checklist. Its body is HTML authored in a rich-text editor — from the dashboard
 * (Content → Hajj Service) or in place on this page.
 *
 * This component exists only to SANITISE. isomorphic-dompurify bundles jsdom and is
 * server-only (see `serverComponentsExternalPackages` in next.config.js), so it cannot
 * move into the island that renders the section — and every public render passing
 * through here is what keeps the stored HTML safe to display, however it was authored.
 *
 * The saved blob comes in as a prop rather than being fetched: a server component
 * cannot read the page's `SiteContentProvider`, so fetching would mean a second
 * request for a section the page already has.
 */
export async function HajjDescription({ saved }: { saved: unknown }) {
  const locale = await getLocale();
  const content = mergeContent(HAJJ_DEFAULT, saved).description;

  return <HajjDescriptionSection html={DOMPurify.sanitize(pick(content.body, locale))} />;
}
