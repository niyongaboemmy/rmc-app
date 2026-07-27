'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Briefcase,
  Search,
  Download,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  FileCheck,
  Settings2,
  Eye,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { resolveI18n } from '@/lib/tendersApi';
import { STATUS_COLORS, type TenderApplicationStatus } from '@/lib/tenderApplicationApi';
import {
  tenderApplicationAdminApi,
  type AdminTenderApplication,
  type TenderReports,
} from '@/lib/tenderApplicationAdminApi';

// Admin UI is not internationalized (same call as the other admin boards) — the
// public-facing pages are, this panel is English-only.
const STATUS_OPTIONS: { value: TenderApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'more_info_requested', label: 'More info requested' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_LABELS: Record<TenderApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  more_info_requested: 'More info',
  shortlisted: 'Shortlisted',
  awarded: 'Awarded',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const PAGE_SIZE = 20;

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
  const canSeeReports = hasPermission(Permission.TENDER_REPORTS);
  // The content board gates on CONTENT_CREATE, so don't offer a link there to
  // someone who'd only be bounced by its own ProtectedRoute.
  const canPublish = hasPermission(Permission.CONTENT_CREATE);

  const [applications, setApplications] = useState<AdminTenderApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [reports, setReports] = useState<TenderReports | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filters = { search: search || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tenderApplicationAdminApi.list({
        search: search || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setApplications(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setApplications([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo, page]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Any filter change invalidates the current page number — page 7 of the old
  // result set is meaningless against the new one, and often out of range.
  useEffect(() => {
    setPage(1);
  }, [search, status, dateFrom, dateTo]);

  useEffect(() => {
    if (!showReports || !canSeeReports) return;
    tenderApplicationAdminApi
      .getReports({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setReports)
      .catch(() => setReports(null));
  }, [showReports, canSeeReports, dateFrom, dateTo]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await tenderApplicationAdminApi.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tender-applications.csv';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tender Applications</h1>
            <p className="text-xs text-gray-400">{total} bid{total === 1 ? '' : 's'} submitted</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Publishing the tenders themselves lives on the content board — tenders
              are announcement rows (type='tender'), so that page owns their CRUD. */}
          {canPublish && (
            <Link
              href={`/${locale}/admin/content/tenders`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 border-2 border-gray-200 rounded-lg hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              <Settings2 className="w-4 h-4" /> Manage tenders
            </Link>
          )}

          {canSeeReports && (
            <>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<BarChart2 className="w-4 h-4" />}
                onClick={() => setShowReports((v) => !v)}
              >
                {showReports ? 'Hide reports' : 'Reports'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                isLoading={exporting}
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reports panel */}
      {showReports && canSeeReports && reports && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total bids" value={String(reports.total)} />
          <StatTile
            label="Awarded value"
            value={`${Number(reports.awardedValue).toLocaleString()} RWF`}
          />
          {reports.byStatus.slice(0, 2).map((row) => (
            <StatTile
              key={row.status}
              label={STATUS_LABELS[row.status] ?? row.status}
              value={String(row.count)}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Company, TIN, reference, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No applications match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                  <Th>Reference</Th>
                  <Th>Company</Th>
                  <Th>Tender</Th>
                  <Th>Bid</Th>
                  <Th>Docs</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-teal-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/admin/tenders/${app.id}`}
                        className="font-mono text-xs font-semibold text-teal-600 hover:underline"
                      >
                        {app.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{app.companyName}</p>
                      <p className="text-xs text-gray-400">TIN {app.companyTin}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="truncate text-gray-600">
                        {app.tender
                          ? resolveI18n(app.tender.titleI18n, app.tender.title, locale)
                          : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {app.bidAmount != null
                        ? `${Number(app.bidAmount).toLocaleString()} RWF`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <FileCheck className="w-3.5 h-3.5" />
                        {app.documents.filter((d) => d.verified).length}/{app.documents.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                          STATUS_COLORS[app.status],
                        )}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/${locale}/admin/tenders/${app.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </th>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
