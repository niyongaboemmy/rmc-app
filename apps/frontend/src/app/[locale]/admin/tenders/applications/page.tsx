'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Briefcase, Inbox, Loader2, Search, Settings2, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { resolveI18n, tendersApi, type Tender } from '@/lib/tendersApi';
import {
  tenderApplicationAdminApi,
  type TenderApplicationCounts,
} from '@/lib/tenderApplicationAdminApi';
import {
  AdminTenderCard,
  getLifecycle,
  type TenderLifecycle,
} from '@/components/admin/tenders/AdminTenderCard';

/**
 * The entry point for evaluating bids: pick a tender, then work its board.
 *
 * Bids are only comparable inside one call for tenders — a shortlist has no
 * meaning across two unrelated procurements — so there is no all-tenders board
 * to land on. This page answers "which tender needs me?" and hands off.
 */

type LifecycleFilter = 'all' | TenderLifecycle;

const FILTERS: { value: LifecycleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'closed', label: 'Closed' },
];

export default function AdminTendersPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_VIEW]}>
      <AdminTendersContent />
    </ProtectedRoute>
  );
}

function AdminTendersContent() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  // The content board gates on CONTENT_CREATE, so don't offer a link there to
  // someone who'd only be bounced by its own ProtectedRoute.
  const canPublish = hasPermission(Permission.CONTENT_CREATE);

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [counts, setCounts] = useState<Record<string, TenderApplicationCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LifecycleFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Counts come from one grouped query, not a request per tender — the
      // picker would otherwise fire a call for every card it renders.
      const [tenderList, countRows] = await Promise.all([
        tendersApi.adminGetAll(200),
        tenderApplicationAdminApi.countsByTender().catch(() => [] as TenderApplicationCounts[]),
      ]);
      setTenders(tenderList);
      setCounts(Object.fromEntries(countRows.map((row) => [row.tenderId, row])));
    } catch {
      setTenders([]);
      setError('Could not load tenders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tenders
      .filter((t) => (filter === 'all' ? true : getLifecycle(t.expiresAt) === filter))
      .filter((t) => {
        if (!needle) return true;
        return resolveI18n(t.titleI18n, t.title, locale).toLowerCase().includes(needle);
      })
      // Live tenders first, then the ones closing soonest — a closed tender is
      // reference material, an open one is work.
      .sort((a, b) => {
        const order: Record<TenderLifecycle, number> = { closing: 0, open: 1, closed: 2 };
        const byLifecycle = order[getLifecycle(a.expiresAt)] - order[getLifecycle(b.expiresAt)];
        if (byLifecycle !== 0) return byLifecycle;
        const aEnd = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bEnd = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
      });
  }, [tenders, filter, query, locale]);

  const totalBids = useMemo(
    () => Object.values(counts).reduce((sum, row) => sum + row.total, 0),
    [counts],
  );

  const filterCounts = useMemo(() => {
    const base: Record<LifecycleFilter, number> = { all: tenders.length, open: 0, closing: 0, closed: 0 };
    for (const tender of tenders) base[getLifecycle(tender.expiresAt)] += 1;
    return base;
  }, [tenders]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <Briefcase className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tender Applications</h1>
            <p className="text-xs text-gray-400">
              {tenders.length} tender{tenders.length === 1 ? '' : 's'} · {totalBids} bid
              {totalBids === 1 ? '' : 's'} submitted
            </p>
          </div>
        </div>

        {canPublish && (
          <Link
            href={`/${locale}/admin/tenders/manage`}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
          >
            <Settings2 className="h-4 w-4" /> Manage tenders
          </Link>
        )}
      </div>

      {/* Search + lifecycle filter.
          Capped rather than elastic. `flex-1` sized the field from whatever the lifecycle
          pills left over, which on a laptop with the sidebar open is a short box; letting
          it span the row instead made it far wider than a title query needs. A fixed
          ceiling sits between the two — and because it no longer demands the whole line,
          the pills still sit beside it wherever there is room and wrap under it when
          there is not. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xl">
          <Input
            placeholder="Search tenders by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-lg border-2 border-gray-200 bg-gray-50 p-0.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === option.value
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {option.label}
              <span className="text-[10px] text-gray-400">{filterCounts[option.value]}</span>
            </button>
          ))}
        </div>
        {(query || filter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-teal-600"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Inbox className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm text-gray-400">
            {tenders.length === 0 ? 'No tenders published yet.' : 'No tenders match these filters.'}
          </p>
          {tenders.length === 0 && canPublish && (
            <Link
              href={`/${locale}/admin/tenders/manage`}
              className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline"
            >
              Publish a tender →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((tender) => (
            <AdminTenderCard
              key={tender.id}
              tender={tender}
              counts={counts[tender.id]}
              locale={locale}
              href={`/${locale}/admin/tenders/applications/board/${tender.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
