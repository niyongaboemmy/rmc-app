import { getLocale } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { HandHeart } from 'lucide-react';
import {
  ContentKeys, getSiteContent, mergeContent, pick, isRtl,
  FUNERAL_DEFAULT, type FuneralContent,
} from '@/lib/content-api';

/**
 * Section: what RMC actually does for a bereaved family — the rites, the
 * paperwork, the cost (none), and the urgency of reporting early.
 *
 * The body is HTML written in the admin rich-text editor (Content → Funeral
 * Service), so it is sanitised here. A server component: isomorphic-dompurify
 * bundles jsdom and is server-only (see next.config.js). Renders nothing once an
 * admin clears the body.
 */
export async function FuneralDescription() {
  const locale = await getLocale();

  const saved = await getSiteContent<FuneralContent>(ContentKeys.funeral).catch(() => null);
  const content = mergeContent(FUNERAL_DEFAULT, saved).description;

  const html = DOMPurify.sanitize(pick(content.body, locale));
  if (!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()) return null;

  const rtl = isRtl(locale);

  return (
    <section id="funeral-about" className="relative scroll-mt-24 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rmc-green-light text-rmc-green">
            <HandHeart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
              {pick(content.eyebrow, locale)}
            </p>
            <h2 className="text-2xl font-bold text-gray-900">
              {pick(content.title, locale)}
            </h2>
          </div>
        </div>

        {/* The section spans the page's full content width like every other one,
            but the prose itself stays at a readable measure. */}
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className={`prose prose-sm md:prose-base max-w-3xl text-gray-600 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold ${rtl ? 'font-arabic' : ''}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
}
