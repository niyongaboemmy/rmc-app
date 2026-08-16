'use client';

/**
 * The whole "Good to know" block — heading, body, and the in-place editors for both.
 *
 * Why the body needs its own editor rather than an `InlineText`: it is rich HTML —
 * paragraphs, bold runs, links — and `InlineText` edits plain text, so binding it here
 * would flatten the markup on the first keystroke. Clicking "Edit text" opens the same
 * TipTap editor the dashboard uses, which is the only control that preserves it.
 *
 * `HajjDescription` stays a server component because sanitising uses
 * isomorphic-dompurify (jsdom, server-only). It hands the SANITISED html down and this
 * island renders it for the public. While editing, the live draft is shown instead so
 * an admin sees their own changes — unsanitised, but it is their own input in their own
 * browser, and every public render passes back through the server sanitiser.
 *
 * The section hides itself when the body is empty, EXCEPT while editing: an admin who
 * clears it would otherwise have no way back in from the page.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Pencil } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/Modal';
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
  const [open, setOpen] = useState(false);

  const lang = locale as Locale;
  const rtl = isRtl(locale);
  const dir = rtl ? ('rtl' as const) : ('ltr' as const);
  const copy = content.description;

  // Editing shows the live draft so a change lands immediately; the public render uses
  // the server-sanitised html it was handed.
  const shown = editing ? pick(copy.body, locale) : html;

  if (isBlank(shown) && !editing) return null;

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
              <div className="min-w-0 flex-1">
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
              {editing && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rmc-green/30 bg-white px-3 py-1.5 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light/40"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit text
                </button>
              )}
            </div>

            {isBlank(shown) ? (
              <p className="text-sm italic text-gray-400">
                No text yet — use “Edit text” to write this section.
              </p>
            ) : (
              <div
                dir={dir}
                className={`prose prose-sm md:prose-base max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold ${rtl ? 'font-arabic' : ''}`}
                dangerouslySetInnerHTML={{ __html: shown }}
              />
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Good to know — body text</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {/* Keyed by language: the editor seeds its content once, so switching locale
              without a remount would leave the previous language's text in the box. */}
          <RichTextEditor
            key={lang}
            value={raw(copy.body, locale)}
            onChange={(next) => setField((d) => { d.description.body[lang] = next; })}
            dir={dir}
            fontClassName={rtl ? 'font-arabic' : ''}
          />
          <p className="mt-3 text-[11px] text-gray-400">
            Editing the {locale.toUpperCase()} version. Changes are saved when you publish.
          </p>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
          >
            Done
          </button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
