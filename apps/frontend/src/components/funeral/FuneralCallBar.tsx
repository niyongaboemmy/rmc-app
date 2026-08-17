'use client';

import { useParams } from 'next/navigation';
import { Phone } from 'lucide-react';
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
 * A persistent call bar pinned to the bottom of the funeral pages.
 *
 * A death is an emergency at any hour, and Islamic burial happens within a day —
 * so the number to call must never be more than one tap away, wherever the
 * visitor has scrolled to. Number and copy are admin-managed (Content → Funeral
 * Service); the bar hides itself if the number is cleared.
 *
 * The right padding keeps the call button clear of the floating "Ask AI" pill,
 * which sits at bottom-right on every page.
 *
 * A client component: it reads the blob through the page's `SiteContentProvider`
 * rather than fetching its own, and the label and note are editable in place. The
 * NUMBER is not — a phone number is not prose, and a mistyped one on an emergency
 * bar fails silently; it is set in the dashboard, where the dial link sits beside it.
 */
export function FuneralCallBar() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<FuneralContent>(
    ContentKeys.funeral,
    FUNERAL_DEFAULT,
  );
  const lang = locale as Locale;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);
  const hotline = content.hotline;

  // Nothing to call: hide the bar entirely rather than show an empty one. While
  // editing it stays, so an admin can see the copy they are about to publish.
  if (!hotline.phone?.trim() && !editing) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 pr-36 sm:px-6 sm:pr-40 lg:px-8">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green sm:flex">
          <Phone className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <InlineText
            as="p"
            lang={locale}
            value={pick(hotline.label, locale)}
            editValue={raw(hotline.label, locale)}
            onCommit={(v) => setField((d) => { d.hotline.label[lang] = v; })}
            className="truncate text-[13px] font-bold text-gray-900"
            dir={dir}
            placeholder="Call bar label"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(hotline.note, locale)}
            editValue={raw(hotline.note, locale)}
            onCommit={(v) => setField((d) => { d.hotline.note[lang] = v; })}
            className="truncate text-[11px] text-gray-500"
            dir={dir}
            placeholder="Note"
          />
        </div>
        {hotline.phone?.trim() ? (
          <a
            href={hotline.phoneHref || `tel:${hotline.phone.replace(/[^\d+]/g, '')}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span dir="ltr">{hotline.phone}</span>
          </a>
        ) : (
          <span className="shrink-0 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-400">
            No number set — add one in Content → Funeral Service
          </span>
        )}
      </div>
    </div>
  );
}
