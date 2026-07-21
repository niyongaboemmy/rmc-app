import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

/**
 * A calm, dignified quick-action card for the funeral dashboard.
 * Presentational + a Link — safe as a server component.
 */
export function FuneralActionCard({
  href,
  icon: Icon,
  title,
  desc,
  tone = 'green',
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone?: 'green' | 'gold' | 'slate';
}) {
  const toneTile =
    tone === 'gold'
      ? 'bg-gradient-to-br from-rmc-gold to-rmc-gold-light text-rmc-green-deep'
      : tone === 'slate'
        ? 'bg-gradient-to-br from-slate-500 to-slate-700 text-white'
        : 'bg-gradient-to-br from-rmc-green to-rmc-green-deep text-white';

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 outline-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rmc-green/5 hover:border-rmc-green/30 focus-visible:ring-2 focus-visible:ring-rmc-green motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100 ${toneTile}`}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-1 text-[15px] font-bold text-gray-900">
          {title}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-rmc-green rtl:rotate-180" aria-hidden="true" />
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}
