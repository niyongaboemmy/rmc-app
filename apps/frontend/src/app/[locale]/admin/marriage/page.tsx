'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search, Heart, Calendar, Filter, ChevronRight,
  Users, Building2, MapPin, RefreshCw,
  TrendingUp, DollarSign, Clock, CheckCircle2,
} from 'lucide-react';
import { marriageApi, MarriageApplication, MarriageApplicationStatus, STATUS_COLORS } from '@/lib/marriageApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'amendments_requested', label: 'Amendments Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  amendments_requested: 'Amendments Requested',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_COLORS[status as MarriageApplicationStatus] ?? 'bg-gray-100 text-gray-700',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending_cash: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    unpaid: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    paid: 'Paid', pending_cash: 'Cash Pending', processing: 'Processing',
    unpaid: 'Unpaid', failed: 'Failed', refunded: 'Refunded',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', classes[status] ?? 'bg-gray-100 text-gray-600')}>
      {labels[status] ?? status}
    </span>
  );
}

interface StatsData {
  total: number;
  byStatus: { status: string; count: string }[];
  revenue: number;
}

function AdminMarriageContent() {
  const { locale } = useParams<{ locale: string }>();
  const [apps, setApps] = useState<MarriageApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const result = await marriageApi.admin.list({
        search: search || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        page,
        limit: 20,
      });
      setApps(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await marriageApi.admin.getStats();
      setStats(s);
    } catch { /* ignore if no permission */ }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const pending = stats?.byStatus.find((s) => s.status === 'submitted')?.count ?? '0';
  const underReview = stats?.byStatus.find((s) => s.status === 'under_review')?.count ?? '0';
  const approved = stats?.byStatus.find((s) => s.status === 'approved')?.count ?? '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            Marriage Applications
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage Nikah service applications</p>
        </div>
        <button
          onClick={fetchApps}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rose-300 hover:text-rose-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Awaiting Review', value: pending, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Approved', value: approved, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
            { label: 'Revenue', value: `${Number(stats.revenue).toLocaleString()} RWF`, icon: <DollarSign className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color)}>
                {stat.icon}
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or application ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          >
            <option value="">All payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending_cash">Cash Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
            <span className="ml-2 text-gray-500">Loading applications...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No applications found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">Application</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Couple</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Venue</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Payment</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold text-rose-700">{app.applicationNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{app.district ?? '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{app.groomName}</p>
                        <p className="text-gray-500 text-xs">& {app.brideName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          {app.venueType === 'mosque'
                            ? <><Building2 className="w-3.5 h-3.5" /> Mosque</>
                            : <><MapPin className="w-3.5 h-3.5" /> Outside</>}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Number(app.amountDue).toLocaleString()} RWF
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-4">
                        <PaymentBadge status={app.paymentStatus} />
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${locale}/admin/marriage/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
                        >
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} applications
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rose-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rose-300 transition-colors"
                  >
                    Next
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

export default function AdminMarriagePage() {
  return (
    <ProtectedRoute permissions={[Permission.MARRIAGE_VIEW]}>
      <AdminMarriageContent />
    </ProtectedRoute>
  );
}
