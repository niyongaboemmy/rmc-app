import { getLocale } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { BookOpen } from 'lucide-react';
import {
  ContentKeys, getSiteContent, mergeContent, pick, isRtl,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';

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
 * Renders nothing when an admin clears the body — an empty editor saves
 * "<p></p>", so we test for actual text, not just a non-empty string.
 */
export async function HajjDescription() {
  const locale = await getLocale();

  const saved = await getSiteContent<HajjContent>(ContentKeys.hajj).catch(() => null);
  const content = mergeContent(HAJJ_DEFAULT, saved).description;

  const html = DOMPurify.sanitize(pick(content.body, locale));
  if (!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()) return null;

  const rtl = isRtl(locale);

  return (
    <section id="hajj-description" className="relative scroll-mt-24 bg-white pb-16 lg:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/70 p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.04]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-rmc-gold/10 blur-2xl" aria-hidden="true" />

          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green">
                <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                  {pick(content.eyebrow, locale)}
                </p>
                <h2 className="text-xl font-bold text-rmc-green-deep md:text-2xl">
                  {pick(content.title, locale)}
                </h2>
              </div>
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
