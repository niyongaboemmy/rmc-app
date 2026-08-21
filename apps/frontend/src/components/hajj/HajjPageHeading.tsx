'use client';

/**
 * The heading on /services/hajj/register and /services/hajj/status.
 *
 * Both pages are server components that own their layout; this island carries just
 * the two lines of copy so a super-admin can edit them in place. Both groups live in
 * the one `hajj` blob rather than sections of their own — they are the same service,
 * and one section key means one thing to publish.
 *
 * The forms below these headings stay in i18n: field labels, placeholders and
 * validation messages are UI, and a validation string an admin can reword is a
 * validation string that can stop matching what the form actually enforces.
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

export function HajjPageHeading({ group }: { group: 'register' | 'status' }) {
  const { locale } = useParams<{ locale: string }>();
  const { content, setField } = useEditableContent<HajjContent>(ContentKeys.hajj, HAJJ_DEFAULT);
  const lang = locale as Locale;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);
  const copy = content[group];

  return (
    <>
      <InlineText
        as="h1"
        lang={locale}
        value={pick(copy.title, locale)}
        editValue={raw(copy.title, locale)}
        onCommit={(v) => setField((d) => { d[group].title[lang] = v; })}
        className="mt-4 text-2xl font-bold text-rmc-green-deep md:text-3xl"
        dir={dir}
        placeholder="Heading"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(copy.subtitle, locale)}
        editValue={raw(copy.subtitle, locale)}
        onCommit={(v) => setField((d) => { d[group].subtitle[lang] = v; })}
        className="mt-1.5 text-sm leading-relaxed text-gray-500 md:text-base"
        dir={dir}
        placeholder="Subheading"
      />
    </>
  );
}
