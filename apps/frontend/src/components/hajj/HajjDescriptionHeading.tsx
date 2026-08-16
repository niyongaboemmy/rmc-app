'use client';

/**
 * The "Good to know" heading pair on the Hajj description block.
 *
 * `HajjDescription` has to stay a SERVER component — it sanitises admin-authored HTML
 * with isomorphic-dompurify, which bundles jsdom and is server-only — so it could not
 * carry `InlineText` itself, and the section was the one part of the Hajj page an
 * admin could not edit in place. This island holds just the two lines so it can.
 *
 * The BODY is deliberately not here. It is rich HTML, and `InlineText` edits plain
 * text: inline-editing it would flatten every paragraph, link and bold run into one
 * string. It stays in the rich-text editor under Content → Hajj Service, which is the
 * only editor that can preserve the markup.
 */

import { useParams } from 'next/navigation';
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

export function HajjDescriptionHeading() {
  const { locale } = useParams<{ locale: string }>();
  const { content, setField } = useEditableContent<HajjContent>(ContentKeys.hajj, HAJJ_DEFAULT);
  const lang = locale as Locale;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);
  const copy = content.description;

  return (
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
  );
}
