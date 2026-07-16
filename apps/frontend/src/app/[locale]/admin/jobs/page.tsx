'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, Briefcase, ChevronRight, RefreshCw, Inbox } from 'lucide-react';
import { type JobApplication, JOB_STATUS_COLORS, type JobApplicationStatus } from '@/lib/jobsApi';
import { jobsAdminApi } from '@/lib/jobsAdminApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'more_info_requested', label: 'More Info Requested' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  more_info_requested: 'More Info Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      JOB_STATUS_COLORS[status as JobApplicationStatus] ?? 'bg-gray-100 text-gray-700',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AdminJobsContent() {
  const { locale } = useParams<{ locale: string }>();
  const [items, setItems] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await jobsAdminApi.list({
        status: status || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setItems(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Refetch when the admin returns to this tab/window so the list is never stale
  // after reviewing an application in another tab.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') fetchList(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchList]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-xs text-gray-400">{total} application{total === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={fetchList}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, position, phone or tracking number…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="font-medium px-5 py-3">Applicant</th>
                  <th className="font-medium px-5 py-3">Position</th>
                  <th className="font-medium px-5 py-3">Tracking #</th>
                  <th className="font-medium px-5 py-3">Status</th>
                  <th className="font-medium px-5 py-3">Submitted</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{app.fullNames}</p>
                      <p className="text-xs text-gray-400">{app.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{app.positionAppliedFor}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{app.trackingNumber}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={app.status} /></td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {new Date(app.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/${locale}/admin/jobs/${app.id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        Review <ChevronRight className="w-4 h-4" />
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
          <p className="text-xs text-gray-400">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <ProtectedRoute permissions={[Permission.JOB_APPLICATIONS_VIEW]}>
      <AdminJobsContent />
    </ProtectedRoute>
  );
}
