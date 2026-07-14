import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * The back pill pinned to the bottom of a service hero — the shared look for
 * every "back" affordance on a service page, whether it points at the services
 * index or at a parent service.
 *
 * It renders its own hero-bottom row, so a hero drops it in right after its
 * centred content block. Sub-pages used to place their back link *below* the
 * hero on the light background, which read as a different control entirely.
 */
export function HeroBackLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="relative flex justify-center px-4 pb-5 pt-2 sm:justify-start sm:px-6 lg:px-8">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur transition-all hover:border-white/50 hover:bg-white/20"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        {label}
      </Link>
    </div>
  );
}
