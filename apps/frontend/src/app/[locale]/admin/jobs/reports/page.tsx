'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { STATUS_LABELS } from '@/lib/jobWorkflow';
import { jobsAdminApi, type JobReports } from '@/lib/jobsAdminApi';

/**
 * Job reporting — application counts by status over a date range.
 *
 * Its own route rather than a panel inside the applications board, mirroring the
 * Tenders "Reports" screen so the sidebar separates working the applications from
 * reporting on them. Job applications carry no monetary value, so — unlike
 * tenders — there is no "awarded value" figure or CSV export here.
 */
export default function JobReportsPage() {
  return (
    <ProtectedRoute permissions={[Permission.JOB_APPLICATIONS_VIEW]}>
      <ReportsView />
    </ProtectedRoute>
  );
}

function ReportsView() {
  const { locale } = useParams<{ locale: string }>();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<JobReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReports(
        await jobsAdminApi.getReports({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      );
    } catch {
      setError('Could not load job reports.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${locale}/admin/jobs`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Applications
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-gray-900">
          <BarChart2 className="h-5 w-5 text-rmc-green" /> Job reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">Applications received, broken down by status.</p>
      </div>

      {/* Date range */}
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
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      )}

      {!loading && reports && (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500">Applications received</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{reports.total}</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">By status</h2>
            {reports.byStatus.length === 0 ? (
              <p className="text-sm text-gray-400">No applications in this period.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {reports.byStatus.map((s) => (
                  <div key={s.status} className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">{STATUS_LABELS[s.status] ?? s.status}</p>
                    <p className="text-lg font-bold text-gray-900">{s.count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
