'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
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
 * The registration CTA, sitting between the journey and the bank accounts —
 * the natural next move once a visitor has read how it works.
 *
 * A band of its own rather than a tail on the steps section: the steps hide
 * themselves when an admin removes every step, and the CTA must not vanish with
 * them.
 *
 * A CLIENT component, unlike the description block beside it. It has no server-only
 * dependency, and going client buys two things: both button labels become editable in
 * place, and the section reads the blob through the page's `SiteContentProvider`
 * rather than firing its own request for a section the page has already fetched.
 */
export function HajjRegisterCta() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );
  const lang = locale as Locale;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);

  const registerLabel = pick(content.about.cta, locale);
  // Sits with the status page's own heading rather than the About block: it is the
  // door into that page, and an admin renaming one should find the other beside it.
  const statusLabel = pick(content.status.checkLabel, locale);

  const registerCls =
    'inline-flex items-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark';
  const statusCls =
    'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-rmc-green transition-colors hover:border-rmc-green/40 hover:bg-rmc-green-light/40';

  return (
    <section className="relative bg-white">
      {/* No top padding: the steps section above already ends on its own py-12 md:py-16,
          so the button reads as the tail of the journey rather than a new block. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 pb-12 md:pb-16 sm:px-8 lg:px-12">
        {/* While editing the buttons become text fields — a <Link> would navigate away
            on the click that is meant to place the caret. */}
        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={registerLabel}
            editValue={raw(content.about.cta, locale)}
            onCommit={(v) => setField((d) => { d.about.cta[lang] = v; })}
            className={registerCls}
            dir={dir}
            placeholder="Button label"
          />
        ) : (
          <Link href={`/${locale}/services/hajj/register`} className={registerCls}>
            {registerLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        )}

        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={statusLabel}
            editValue={raw(content.status.checkLabel, locale)}
            onCommit={(v) => setField((d) => { d.status.checkLabel[lang] = v; })}
            className={statusCls}
            dir={dir}
            placeholder="Button label"
          />
        ) : (
          <Link href={`/${locale}/services/hajj/status`} className={statusCls}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {statusLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
