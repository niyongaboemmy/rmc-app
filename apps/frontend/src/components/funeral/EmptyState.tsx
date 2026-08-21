import { type LucideIcon } from 'lucide-react';

/**
 * Reusable empty state for funeral list/search surfaces. Server-safe.
 *
 * `className` overrides the container so a caller can match the radius of whatever
 * it replaces — this stands in for a card grid on the public cemeteries page and for
 * a table on Admin → Funeral, and those two do not share a corner radius.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center ${className}`}>
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[13px] text-gray-400">{message}</p>}
    </div>
  );
}
