import { type LucideIcon } from 'lucide-react';

/** A single dashboard statistic tile. Presentational — server-safe. */
export function FuneralStatCard({
  icon: Icon,
  label,
  value,
  tone = 'green',
  loading = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: 'green' | 'gold' | 'slate' | 'amber';
  loading?: boolean;
}) {
  const tile: Record<string, string> = {
    green: 'bg-rmc-green-light text-rmc-green',
    gold: 'bg-rmc-gold/10 text-[#8A6A0F]',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${tile[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {loading ? (
        <div className="h-7 w-12 animate-pulse rounded-md bg-gray-100" aria-hidden="true" />
      ) : (
        <p className="text-2xl font-bold leading-none tabular-nums text-gray-900">{value}</p>
      )}
      <p className="mt-1.5 text-[13px] text-gray-500">{label}</p>
    </div>
  );
}
