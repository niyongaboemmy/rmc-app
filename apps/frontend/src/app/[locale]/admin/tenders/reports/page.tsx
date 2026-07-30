'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart2, Download, Loader2, Wallet } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { STATUS_LABELS } from '@/lib/tenderWorkflow';
import {
  tenderApplicationAdminApi,
  type TenderReports,
} from '@/lib/tenderApplicationAdminApi';

/**
 * Tender reporting — bid counts by status, awarded value, and the CSV export.
 *
 * Its own route rather than a panel inside the applications screen, because the
 * sidebar now separates the three things a tender administrator does: author the
 * tenders, work the bids, and report on them. It is also separately permissioned
 * — TENDER_REPORTS, not TENDER_VIEW — so someone who may read bids does not
 * automatically get the money figures.
 *
 * The endpoints already existed (`/admin/tenders/reports` and `…/reports/export`);
 * nothing but this screen was missing.
 */
export default function TenderReportsPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_REPORTS]}>
      <ReportsView />
    </ProtectedRoute>
  );
}

function ReportsView() {
  const { locale } = useParams<{ locale: string }>();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<TenderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReports(
        await tenderApplicationAdminApi.getReports({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      );
    } catch {
      setError('Could not load tender reports.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await tenderApplicationAdminApi.exportCsv({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // The date range is in the filename, so a downloaded file still says what
      // it covers once it is sitting in someone's Downloads folder.
      const range = dateFrom || dateTo ? `-${dateFrom || 'start'}_${dateTo || 'today'}` : '';
      a.download = `tender-bids${range}.csv`;
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
        <Link
          href={`/${locale}/admin/tenders`}
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

      {/* Date range + export */}
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
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100"
          >
            Clear
          </button>
        )}
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

      {!loading && reports && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">Bids received</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{reports.total}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Wallet className="h-3.5 w-3.5" /> Awarded value
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Number(reports.awardedValue).toLocaleString()} RWF
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">By status</h2>
            {reports.byStatus.length === 0 ? (
              <p className="text-sm text-gray-400">No bids in this period.</p>
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
