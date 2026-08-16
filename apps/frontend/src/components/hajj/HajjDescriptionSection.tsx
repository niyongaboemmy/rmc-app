'use client';

/**
 * The whole "Good to know" block — heading, body, and the in-place editors for both.
 *
 * The body is rich HTML, so it cannot use `InlineText`, which edits plain text and
 * would flatten every paragraph, link and bold run on the first keystroke. In Edit
 * Mode the rendered prose is replaced IN PLACE by the same TipTap editor the dashboard
 * uses — the paragraph becomes editable where it sits, with its formatting intact,
 * rather than opening somewhere else.
 *
 * `HajjDescription` stays a server component because sanitising uses
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
import { BookOpen } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys,
  HAJJ_DEFAULT,
  isRtl,
  pick,
  raw,
  type HajjContent,
  type Locale,
} from '@/lib/content-api';

/**
 * Loaded on demand. TipTap is a large dependency and only a super-admin in Edit Mode
 * ever renders it; importing it statically put the whole editor in the bundle every
 * visitor downloads. `ssr: false` because it is browser-only and never server-renders.
 */
const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false },
);

/** True when the HTML carries no actual words — an empty editor saves "<p></p>". */
function isBlank(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

export function HajjDescriptionSection({ html }: { html: string }) {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );

  const lang = locale as Locale;
  const rtl = isRtl(locale);
  const dir = rtl ? ('rtl' as const) : ('ltr' as const);
  const copy = content.description;

  if (isBlank(html) && !editing) return null;

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
                  className="text-xl font-bold text-rmc-green-deep md:text-2xl"
                  dir={dir}
                  placeholder="Heading"
                />
              </div>
            </div>

            {editing ? (
              /* Keyed by language: the editor seeds its content once, so switching
                 locale without a remount would leave the previous language in the box. */
              <RichTextEditor
                key={lang}
                value={raw(copy.body, locale)}
                onChange={(next) => setField((d) => { d.description.body[lang] = next; })}
                dir={dir}
                fontClassName={rtl ? 'font-arabic' : ''}
              />
            ) : (
              <div
                dir={dir}
                className={`prose prose-sm md:prose-base max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold ${rtl ? 'font-arabic' : ''}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
