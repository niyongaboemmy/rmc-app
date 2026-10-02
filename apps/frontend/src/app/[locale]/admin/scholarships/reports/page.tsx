'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart2, Download, Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import {
  scholarshipAdminApi,
  type AdminScholarshipStats,
} from '@/lib/scholarshipAdminApi';
import type { ScholarshipProgram } from '@/lib/scholarshipApi';

/** Geometry only, to sit level with the date inputs beside it. */
const SELECT_TRIGGER = 'rounded-lg border-gray-300 px-3 py-2 text-sm';

/** Pipeline order, so the breakdown reads as a journey rather than an alphabet. */
const STATUS_ORDER = [
  'draft', 'submitted', 'under_review', 'approved', 'confirmed', 'rejected', 'cancelled',
] as const;

/**
 * A SEMANTIC palette, not chrome — these colours exist to tell seven states
 * apart, so they deliberately stay outside the green accent used everywhere
 * else on this screen. `confirmed` in particular must not become green: it sits
 * next to `approved` in the pipeline and the two would be indistinguishable.
 * Matches STATUS_COLORS in scholarshipApi.ts, which the badges use.
 */
const STATUS_BAR: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  under_review: 'bg-amber-500',
  approved: 'bg-green-500',
  confirmed: 'bg-violet-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
};

/**
 * Scholarship reporting — applications by status, filtered by scholarship and
 * date, plus the CSV export.
 *
 * Its own route now that the sidebar has submenus. Separately permissioned on
 * SCHOLARSHIP_REPORTS, so someone who may read applications does not
 * automatically get the aggregate view or the export.
 *
 * The endpoints already existed (`/admin/scholarship/reports` and
 * `…/reports/export`); previously they were reachable only through a collapsed
 * panel inside the applications screen.
 */
export default function AdminScholarshipReportsPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_REPORTS]}>
      <ReportsView />
    </ProtectedRoute>
  );
}

function ReportsView() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [programId, setProgramId] = useState('');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [stats, setStats] = useState<AdminScholarshipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    scholarshipAdminApi.listPrograms().then(setPrograms).catch(() => setPrograms([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(
        await scholarshipAdminApi.getReports({
          programId: programId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      );
    } catch {
      setError('Could not load scholarship reports.');
    } finally {
      setLoading(false);
    }
  }, [programId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Which scholarship (or all) the figures on screen describe. */
  const scopeLabel = programId
    ? (programs.find((p) => p.id === programId)?.title ?? 'selected scholarship')
    : 'across all scholarships';

  /*
   * Ordered along the pipeline rather than however Postgres grouped them, so the
   * list reads as a journey: submitted → under review → approved → confirmed,
   * with the terminal states last. Percentages are of the filtered total.
   */
  const ordered = STATUS_ORDER.flatMap((status) => {
    const row = stats?.byStatus.find((s) => s.status === status);
    if (!row) return [];
    const count = Number(row.count);
    const total = stats?.total || 1;
    return [{ status, count, pct: Math.round((count / total) * 100) }];
  });

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await scholarshipAdminApi.exportCsv({
        programId: programId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Range in the filename, so a downloaded file still says what it covers.
      const range = dateFrom || dateTo ? `-${dateFrom || 'start'}_${dateTo || 'today'}` : '';
      a.download = `scholarship-applications${range}.csv`;
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BarChart2 className="h-6 w-6 text-rmc-green" /> Scholarship reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Applications received by status, and the CSV export.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
          />
        </div>
        <div>
          {/* Scopes the counts AND the export, so what is on screen and what is
              in the download describe the same set. */}
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Scholarship</label>
          <div className="w-56">
            <SearchableSelect
              value={programId}
              onChange={setProgramId}
              options={[
                { value: '', label: 'All scholarships' },
                ...programs.map((p) => ({ value: p.id, label: p.title })),
              ]}
              searchPlaceholder="Find a scholarship…"
              triggerClassName={SELECT_TRIGGER}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="ms-auto inline-flex items-center gap-2 rounded-lg bg-rmc-green px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {loading && (
        <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      )}

      {!loading && stats && stats.total === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <BarChart2 className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">Nothing to report yet</p>
          <p className="mt-1 text-xs text-gray-400">
            No applications match {scopeLabel.toLowerCase()}.
          </p>
        </div>
      )}

      {!loading && stats && stats.total > 0 && (
        <>
          {/* Headline first, and it names its own scope — a screenshot of this
              page should say what it is counting without the filters in frame. */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400">Applications received</p>
            <div className="mt-1 flex items-baseline gap-2.5">
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">{scopeLabel}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">By status</h2>
            <ul className="space-y-3">
              {ordered.map(({ status, count, pct }) => (
                <li key={status}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-gray-700">{STATUS_LABELS[status] ?? status}</span>
                    <span className="shrink-0 text-sm tabular-nums text-gray-500">
                      <span className="font-semibold text-gray-900">{count}</span>
                      {' · '}{pct}%
                    </span>
                  </div>
                  {/* A bar makes the shape of the pipeline legible at a glance —
                      four bare numbers in boxes do not show that most applicants
                      are stuck at one stage. */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${STATUS_BAR[status] ?? 'bg-gray-400'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

    </div>
  );
}
