import { getLocale } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { mergeContent, pick, FUNERAL_DEFAULT } from '@/lib/content-api';
import { FuneralDescriptionSection } from './FuneralDescriptionSection';

/**
 * Section: what RMC actually does for a bereaved family — the rites, the
 * paperwork, the cost (none), and the urgency of reporting early.
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
export async function FuneralDescription({ saved }: { saved: unknown }) {
  const locale = await getLocale();
  const content = mergeContent(FUNERAL_DEFAULT, saved).description;

  return <FuneralDescriptionSection html={DOMPurify.sanitize(pick(content.body, locale))} />;
}
