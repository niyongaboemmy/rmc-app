'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  Loader2,
  ListChecks,
  Users,
  Wallet,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/tenderWorkflow';
import { resolveI18n, tendersApi, type Tender } from '@/lib/tendersApi';
import {
  tenderApplicationAdminApi,
  type AdminListFilters,
  type AdminTenderApplication,
  type TenderReports,
} from '@/lib/tenderApplicationAdminApi';
import { STATUS_COLORS, type TenderApplicationStatus } from '@/lib/tenderApplicationApi';

/**
 * Tender reporting — bid counts by status, awarded value, the bid list and the
 * CSV export.
 *
 * Its own route rather than a panel inside the applications screen, because the
 * sidebar separates the three things a tender administrator does: author the
 * tenders, work the bids, and report on them. It is also separately permissioned
 * — TENDER_REPORTS, not TENDER_VIEW — so someone who may read bids does not
 * automatically get the money figures.
 *
 * One period drives everything on the page. The summary endpoint only takes a
 * date range, so the tender and status filters sit on the bid list, and narrow
 * that list and the CSV only. The list itself is a TENDER_VIEW endpoint, so a
 * reports-only reader gets the figures and the export without it.
 */
export default function TenderReportsPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_REPORTS]}>
      <ReportsView />
    </ProtectedRoute>
  );
}

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

const SELECT_CLASS =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rmc-green';

/** yyyy-mm-dd in local time, for date inputs and API date filters. */
function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
    case 'month':
      return { dateFrom: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: today };
    case 'year':
      return { dateFrom: toDateInput(new Date(now.getFullYear(), 0, 1)), dateTo: today };
    default:
      return {};
  }
}

function ReportsView() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canViewBids = hasPermission(Permission.TENDER_VIEW);

  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [tenderId, setTenderId] = useState('');
  const [status, setStatus] = useState('');

  const [reports, setReports] = useState<TenderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const range = useMemo(
    () =>
      period === 'custom'
        ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
        : periodRange(period),
    [period, customFrom, customTo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReports(await tenderApplicationAdminApi.getReports(range));
    } catch {
      setError('Could not load tender reports.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await tenderApplicationAdminApi.exportCsv({
        ...range,
        tenderId: tenderId || undefined,
        status: status || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // The date range is in the filename, so a downloaded file still says what
      // it covers once it is sitting in someone's Downloads folder.
      const { dateFrom, dateTo } = range;
      const suffix = dateFrom || dateTo ? `-${dateFrom || 'start'}_${dateTo || 'today'}` : '';
      a.download = `tender-bids${suffix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not export the CSV.');
    } finally {
      setExporting(false);
    }
  };

  const byStatus = useMemo(
    () =>
      Object.fromEntries((reports?.byStatus ?? []).map((row) => [row.status, Number(row.count)])) as Partial<
        Record<TenderApplicationStatus, number>
      >,
    [reports],
  );

  const narrowed = Boolean(tenderId || status);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${locale}/admin/tenders/applications`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Applications
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-gray-900">
          <BarChart2 className="h-5 w-5 text-rmc-green" /> Tender reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Bids received by status, and the value of everything awarded.
        </p>
      </div>

      {/* Period + export */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label htmlFor="report-period" className="mb-1.5 block text-xs font-medium text-gray-600">Period</label>
          <select
            id="report-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={SELECT_CLASS}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div>
              <label htmlFor="report-from" className="mb-1.5 block text-xs font-medium text-gray-600">From</label>
              <input
                id="report-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={SELECT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1.5 block text-xs font-medium text-gray-600">To</label>
              <input
                id="report-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className={SELECT_CLASS}
              />
            </div>
          </>
        )}
        <div className="flex flex-col items-start gap-1 sm:ms-auto sm:items-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {narrowed && <p className="text-[11px] text-gray-400">Uses the bid list filters below</p>}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {loading && (
        <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      )}

      {!loading && reports && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Bids received" value={reports.total.toLocaleString()} />
            <StatCard
              icon={Wallet}
              label="Awarded value"
              value={`${Number(reports.awardedValue || 0).toLocaleString()} RWF`}
            />
            <StatCard icon={ListChecks} label="Shortlisted" value={(byStatus.shortlisted ?? 0).toLocaleString()} />
            <StatCard icon={Award} label="Awarded" value={(byStatus.awarded ?? 0).toLocaleString()} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">By status</h2>
            {reports.total === 0 ? (
              <p className="text-sm text-gray-400">No bids in this period.</p>
            ) : (
              // Every status, zeros included, so the breakdown keeps the same
              // shape from one period to the next.
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(Object.keys(STATUS_LABELS) as TenderApplicationStatus[]).map((s) => (
                  <div key={s} className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">{STATUS_LABELS[s]}</p>
                    <p className={cn('text-lg font-bold', byStatus[s] ? 'text-gray-900' : 'text-gray-300')}>
                      {(byStatus[s] ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {canViewBids && (
        <BidList
          locale={locale}
          range={range}
          tenderId={tenderId}
          status={status}
          onTenderChange={setTenderId}
          onStatusChange={setStatus}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ── Bid list ─────────────────────────────────────────────────────────────────

function BidList({
  locale,
  range,
  tenderId,
  status,
  onTenderChange,
  onStatusChange,
}: {
  locale: string;
  range: { dateFrom?: string; dateTo?: string };
  tenderId: string;
  status: string;
  onTenderChange: (id: string) => void;
  onStatusChange: (status: string) => void;
}) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminTenderApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    tendersApi.adminGetAll(200).then(setTenders).catch(() => setTenders([]));
  }, []);

  // Any filter change resets pagination — a stale page number on a narrowed
  // result set would otherwise render an empty table above real rows.
  useEffect(() => { setPage(1); }, [tenderId, status, range]);

  const filters: AdminListFilters = useMemo(
    () => ({
      ...range,
      tenderId: tenderId || undefined,
      status: status || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [range, tenderId, status, page],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    tenderApplicationAdminApi
      .list(filters)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setPages(result.pages);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <h2 className="text-sm font-semibold text-gray-900 sm:me-auto">Bids</h2>
        <select
          aria-label="Tender"
          value={tenderId}
          onChange={(e) => onTenderChange(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All tenders</option>
          {tenders.map((t) => (
            <option key={t.id} value={t.id}>
              {resolveI18n(t.titleI18n, t.title, locale)}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as TenderApplicationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-rmc-green" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <FileBarChart className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm text-gray-400">
            {failed ? 'Could not load the bids.' : 'No bids match these filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-start font-medium text-gray-600">Bidder</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">Tender</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">Bid amount</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((app) => (
                  <tr key={app.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/${locale}/admin/tenders/applications/${app.id}`}
                        className="font-medium text-gray-900 hover:text-rmc-green"
                      >
                        {app.companyName}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-400">{app.contactName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {app.tender ? resolveI18n(app.tender.titleI18n, app.tender.title, locale) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-gray-600">
                      {app.bidAmount != null ? `${Number(app.bidAmount).toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[app.status])}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-500">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-rmc-green disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, pages))}
                  disabled={page === pages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-rmc-green disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
