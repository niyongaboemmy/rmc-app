'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { resolveI18n, tendersApi, type Tender } from '@/lib/tendersApi';
import {
  tenderApplicationAdminApi,
  type AdminListFilters,
  type AdminTenderApplication,
  type TenderReports,
} from '@/lib/tenderApplicationAdminApi';
import { STATUS_COLORS, type TenderApplicationStatus } from '@/lib/tenderApplicationApi';
import { STATUS_LABELS } from '@/lib/tenderWorkflow';

/**
 * "Dashboard" gives the lifetime shape of the pipeline (counts by status,
 * value awarded). "Report" is the working view an evaluator actually files
 * from: a paginated, period-filtered, CSV-exportable list of bids.
 */

type Tab = 'dashboard' | 'report';

type Period = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const PAGE_SIZE = 20;

/** yyyy-mm-dd in local time, for date inputs and API date filters. */
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodRange(period: Period): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = toDateInput(now);
  switch (period) {
    case 'today':
      return { dateFrom: today, dateTo: today };
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { dateFrom: toDateInput(start), dateTo: today };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toDateInput(start), dateTo: today };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: toDateInput(start), dateTo: today };
    }
    default:
      return {};
  }
}

export default function AdminTenderDashboardPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_REPORTS]}>
      <AdminTenderDashboardContent />
    </ProtectedRoute>
  );
}

function AdminTenderDashboardContent() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <BarChart2 className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tenders — Dashboard &amp; Reports</h1>
          <p className="text-xs text-gray-400">Pipeline overview and exportable bid reports.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100">
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<TrendingUp className="h-4 w-4" />} label="Dashboard" />
        <TabButton active={tab === 'report'} onClick={() => setTab('report')} icon={<FileBarChart className="h-4 w-4" />} label="Report" />
      </div>

      {tab === 'dashboard' ? <DashboardTab /> : <ReportTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-800',
      )}
    >
      {icon} {label}
    </button>
  );
}

// ── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<TenderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tenderApplicationAdminApi
      .getReports()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setError('Could not load the pipeline overview.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error ?? 'Could not load the pipeline overview.'}
      </div>
    );
  }

  const byStatus = Object.fromEntries(stats.byStatus.map((row) => [row.status, Number(row.count)])) as Partial<
    Record<TenderApplicationStatus, number>
  >;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total bids" value={stats.total.toLocaleString()} icon={<Users className="h-5 w-5" />} color="text-blue-600 bg-blue-50" />
        <StatCard label="Awarded value" value={`${Number(stats.awardedValue || 0).toLocaleString()} RWF`} icon={<TrendingUp className="h-5 w-5" />} color="text-green-600 bg-green-50" />
        <StatCard label="Shortlisted" value={(byStatus.shortlisted ?? 0).toLocaleString()} icon={<Briefcase className="h-5 w-5" />} color="text-teal-600 bg-teal-50" />
        <StatCard label="Awarded" value={(byStatus.awarded ?? 0).toLocaleString()} icon={<BarChart2 className="h-5 w-5" />} color="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Bids by status</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(Object.keys(STATUS_LABELS) as TenderApplicationStatus[]).map((status) => (
            <div key={status} className="rounded-xl bg-gray-50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{STATUS_LABELS[status]}</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900">{(byStatus[status] ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', color)}>{icon}</div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ── Report tab ───────────────────────────────────────────────────────────────

function ReportTab() {
  const { locale } = useParams<{ locale: string }>();

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tenderId, setTenderId] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminTenderApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    tendersApi.adminGetAll(200).then(setTenders).catch(() => setTenders([]));
  }, []);

  const range = useMemo(
    () => (period === 'custom' ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined } : periodRange(period)),
    [period, customFrom, customTo],
  );

  const filters: AdminListFilters = useMemo(
    () => ({
      tenderId: tenderId || undefined,
      status: status || undefined,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      page,
      limit: PAGE_SIZE,
    }),
    [tenderId, status, range, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tenderApplicationAdminApi.list(filters);
      setItems(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change resets pagination — a stale page number on a narrowed
  // result set would otherwise render an empty table above real rows.
  useEffect(() => { setPage(1); }, [tenderId, status, period, customFrom, customTo]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await tenderApplicationAdminApi.exportCsv({ ...filters, page: undefined, limit: undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tender-applications-${toDateInput(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Export failure isn't fatal to the page — the table above still has the data.
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <select
          value={tenderId}
          onChange={(e) => setTenderId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All tenders</option>
          {tenders.map((t) => (
            <option key={t.id} value={t.id}>
              {resolveI18n(t.titleI18n, t.title, locale)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as TenderApplicationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {period === 'custom' && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-rmc-green px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <FileBarChart className="mx-auto mb-3 h-9 w-9 text-gray-300" />
            <p className="text-sm text-gray-400">No bids match these filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Bidder</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tender</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Bid amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((app) => (
                    <tr key={app.id} className="hover:bg-teal-50/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{app.companyName}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{app.contactName}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {app.tender ? resolveI18n(app.tender.titleI18n, app.tender.title, locale) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {app.bidAmount != null ? `${Number(app.bidAmount).toLocaleString()} RWF` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[app.status])}>
                          {STATUS_LABELS[app.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {new Date(app.submittedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} bids
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-teal-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-teal-300 disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
