'use client';

/**
 * "What we do" — the block describing what RMC does for a bereaved family.
 *
 * The body is rich HTML, so it cannot use `InlineText`, which edits plain text and
 * would flatten every paragraph, link and bold run on the first keystroke. In Edit
 * Mode the rendered prose is replaced IN PLACE by the same TipTap editor the dashboard
 * uses, so the text is edited where it is read.
 *
 * `FuneralDescription` stays a server component because sanitising uses
 * isomorphic-dompurify (jsdom, server-only). It hands the SANITISED html down and this
 * island renders it for the public. While editing, the editor holds the live draft —
 * unsanitised, but it is the admin's own input in their own browser, and every public
 * render passes back through the server sanitiser.
 *
 * The section hides itself when the body is empty, EXCEPT while editing: an admin who
 * cleared it would otherwise have no way back in from the page.
 */

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { HandHeart } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys,
  FUNERAL_DEFAULT,
  isRtl,
  pick,
  raw,
  type FuneralContent,
  type Locale,
} from '@/lib/content-api';

/**
 * Loaded on demand. TipTap is a large dependency and only a super-admin in Edit Mode
 * ever renders it; importing it statically would put the whole editor in the bundle
 * every visitor downloads. `ssr: false` because it is browser-only.
 */
const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false },
);

/** True when the HTML carries no actual words — an empty editor saves "<p></p>". */
function isBlank(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

export function FuneralDescriptionSection({ html }: { html: string }) {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<FuneralContent>(
    ContentKeys.funeral,
    FUNERAL_DEFAULT,
  );

  const lang = locale as Locale;
  const rtl = isRtl(locale);
  const dir = rtl ? ('rtl' as const) : ('ltr' as const);
  const copy = content.description;

  if (isBlank(html) && !editing) return null;

  return (
    <section id="funeral-about" className="relative scroll-mt-24 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rmc-green-light text-rmc-green">
            <HandHeart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <InlineText
              as="p"
              lang={locale}
              value={pick(copy.eyebrow, locale)}
              editValue={raw(copy.eyebrow, locale)}
              onCommit={(v) => setField((d) => { d.description.eyebrow[lang] = v; })}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
              dir={dir}
              placeholder="Eyebrow"
            />
            <InlineText
              as="h2"
              lang={locale}
              value={pick(copy.title, locale)}
              editValue={raw(copy.title, locale)}
              onCommit={(v) => setField((d) => { d.description.title[lang] = v; })}
              className="text-2xl font-bold text-gray-900"
              dir={dir}
              placeholder="Heading"
            />
          </div>
        </div>

        {/* The section spans the page's full content width like every other one,
            but the prose itself stays at a readable measure. */}
        {editing ? (
          /* Keyed by language: the editor seeds its content once, so switching locale
             without a remount would leave the previous language in the box. */
          <div className="max-w-3xl">
            <RichTextEditor
              key={lang}
              value={raw(copy.body, locale)}
              onChange={(next) => setField((d) => { d.description.body[lang] = next; })}
              dir={dir}
              fontClassName={rtl ? 'font-arabic' : ''}
            />
          </div>
        ) : (
          <div
            dir={dir}
            className={`prose prose-sm md:prose-base max-w-3xl text-gray-600 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold ${rtl ? 'font-arabic' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </section>
  );
}
