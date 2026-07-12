import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import {
  ContentKeys, getSiteContent, mergeContent, pick,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';

/**
 * The registration CTA, sitting between the journey and the bank accounts —
 * the natural next move once a visitor has read how it works.
 *
 * A band of its own rather than a tail on the steps section: the steps hide
 * themselves when an admin removes every step, and the CTA must not vanish with
 * them. Its label is still admin-managed on the About block (Content → Hajj
 * Service), where it has always lived.
 */
export async function HajjRegisterCta() {
  const locale = await getLocale();

  const saved = await getSiteContent<HajjContent>(ContentKeys.hajj).catch(() => null);
  const label = pick(mergeContent(HAJJ_DEFAULT, saved).about.cta, locale);

  return (
    <section className="relative bg-white">
      {/* No top padding: the steps section above already ends on its own py-16,
          so the button reads as the tail of the journey rather than a new block. */}
      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-12">
        <Link
          href={`/${locale}/services/hajj/register`}
          className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
        >
          {label} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
