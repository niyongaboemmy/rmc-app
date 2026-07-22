import { getLocale } from 'next-intl/server';
import { Phone } from 'lucide-react';
import {
  ContentKeys, getSiteContent, mergeContent, pick,
  FUNERAL_DEFAULT, type FuneralContent,
} from '@/lib/content-api';

/**
 * A persistent call bar pinned to the bottom of the funeral page.
 *
 * A death is an emergency at any hour, and Islamic burial happens within a day —
 * so the number to call must never be more than one tap away, wherever the
 * visitor has scrolled to. Number and copy are admin-managed (Content → Funeral
 * Service); the bar hides itself if the number is cleared.
 *
 * The right padding keeps the call button clear of the floating "Ask AI" pill,
 * which sits at bottom-right on every page.
 */
export async function FuneralCallBar() {
  const locale = await getLocale();

  const saved = await getSiteContent<FuneralContent>(ContentKeys.funeral).catch(() => null);
  const hotline = mergeContent(FUNERAL_DEFAULT, saved).hotline;

  if (!hotline.phone?.trim()) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 pr-36 sm:px-6 sm:pr-40 lg:px-8">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green sm:flex">
          <Phone className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-gray-900">{pick(hotline.label, locale)}</p>
          <p className="truncate text-[11px] text-gray-500">{pick(hotline.note, locale)}</p>
        </div>
        <a
          href={hotline.phoneHref || `tel:${hotline.phone.replace(/[^\d+]/g, '')}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          <span dir="ltr">{hotline.phone}</span>
        </a>
      </div>
    </div>
  );
}
