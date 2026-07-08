/** Slim progress bar: how many timeline steps are done out of the total. */
export function FuneralProgress({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-500">{label}</span>
        <span className="text-[13px] font-bold tabular-nums text-rmc-green">{pct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
