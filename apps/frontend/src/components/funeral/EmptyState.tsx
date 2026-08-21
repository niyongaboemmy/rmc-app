import { type LucideIcon } from 'lucide-react';

/** Reusable empty state for funeral list/search surfaces. Server-safe. */
export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[13px] text-gray-400">{message}</p>}
    </div>
  );
}
