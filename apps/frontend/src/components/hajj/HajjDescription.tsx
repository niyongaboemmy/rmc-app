import { getLocale } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { BookOpen } from 'lucide-react';
import {
  mergeContent, pick, isRtl,
  HAJJ_DEFAULT,
} from '@/lib/content-api';
import { HajjDescriptionHeading } from './HajjDescriptionHeading';

/**
 * Section: the descriptive block between the About section and the requirements
 * checklist. Its body is HTML authored in the admin rich-text editor
 * (Content → Hajj Service).
 *
 * A server component, unlike the sibling Hajj sections: sanitizing the HTML uses
 * isomorphic-dompurify, which bundles jsdom and is server-only (see
 * `serverComponentsExternalPackages` in next.config.js). The page is
 * force-dynamic, so an admin's edit shows up on the next request.
 *
 * The saved blob comes in as a prop rather than being fetched here. A server
 * component cannot read the page's `SiteContentProvider` — that is client context —
 * so fetching would mean a second request for a section the page already has. The
 * page passes the RAW value; the merge below is what it always was.
 *
 * Renders nothing when an admin clears the body — an empty editor saves
 * "<p></p>", so we test for actual text, not just a non-empty string.
 */
export async function HajjDescription({ saved }: { saved: unknown }) {
  const locale = await getLocale();
  const content = mergeContent(HAJJ_DEFAULT, saved).description;

  const html = DOMPurify.sanitize(pick(content.body, locale));
  if (!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()) return null;

  const rtl = isRtl(locale);

  return (
    <section id="hajj-description" className="relative scroll-mt-24 bg-white pb-12 md:pb-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50/70 p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.04]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-rmc-gold/10 blur-2xl" aria-hidden="true" />

          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rmc-green-light text-rmc-green">
                <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              {/* The heading is a client island so it can be edited in place; this
                  component cannot carry InlineText itself (see the file header). */}
              <HajjDescriptionHeading />
            </div>

            <div
              dir={rtl ? 'rtl' : 'ltr'}
              className={`prose prose-sm md:prose-base max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold ${rtl ? 'font-arabic' : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
