/** Loading placeholder matching the AnnouncementCard shape. Server-safe. */
export function AnnouncementSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-gray-50 bg-gray-50/60 p-5">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="space-y-2.5 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-gray-100" />
        ))}
      </div>
      <div className="h-10 animate-pulse bg-rmc-green-light/20" />
    </div>
  );
}
