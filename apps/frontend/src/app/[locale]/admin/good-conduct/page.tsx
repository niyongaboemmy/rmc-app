'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search, ShieldCheck, ChevronRight, RefreshCw,
  Users, DollarSign, Clock, CheckCircle2, Download, BarChart2,
} from 'lucide-react';
import {
  goodConductApi, type GoodConductRequest, type GoodConductStatus, STATUS_COLORS,
} from '@/lib/goodConductApi';
import { goodConductAdminApi, type AdminGoodConductStats } from '@/lib/goodConductAdminApi';
import { mosqueApi, type Mosque } from '@/lib/mosqueApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'more_info_requested', label: 'More Info Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  more_info_requested: 'More Info Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

const MOTIF_LABELS: Record<string, string> = {
  employment: 'Employment',
  visa: 'Visa',
  school: 'School',
  other: 'Other',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_COLORS[status as GoodConductStatus] ?? 'bg-gray-100 text-gray-700',
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

function AdminGoodConductContent() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const permReports = hasPermission(Permission.GOOD_CONDUCT_REPORTS);

  const [requests, setRequests] = useState<GoodConductRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminGoodConductStats | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [mosqueFilter, setMosqueFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await goodConductAdminApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        mosqueId: mosqueFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setRequests(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, mosqueFilter, dateFrom, dateTo, page]);

  const fetchStats = useCallback(async () => {
    if (!permReports) return;
    try {
      const s = await goodConductAdminApi.getReports();
      setStats(s);
    } catch { /* ignore if no permission */ }
  }, [permReports]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { mosqueApi.list().then(setMosques).catch(() => {}); }, []);

  // The backend's report aggregate is a lifetime count by status (no date
  // breakdown), so this is "Approved" overall rather than "this month".
  const approved = stats?.byStatus.find((s) => s.status === 'approved')?.count ?? '0';
  const pending = stats?.byStatus.find((s) => s.status === 'submitted')?.count ?? '0';
  const underReview = stats?.byStatus.find((s) => s.status === 'under_review')?.count ?? '0';

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await goodConductAdminApi.exportCsv({
        search: search || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        mosqueId: mosqueFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'good-conduct-requests.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Good Conduct Requests
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage Good Conduct certificate requests</p>
        </div>
        <div className="flex gap-2">
          {permReports && (
            <button
              onClick={() => setShowReports((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              <BarChart2 className="w-4 h-4" /> {showReports ? 'Hide Reports' : 'Reports'}
            </button>
          )}
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Requests', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Awaiting Review', value: pending, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Under Review', value: underReview, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50' },
            { label: 'Approved', value: approved, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
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

      {/* Reports panel */}
      {showReports && permReports && stats && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-indigo-500" /> Reports
            </h3>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs text-indigo-600">Total Revenue</p>
              <p className="text-lg font-bold text-indigo-900">{Number(stats.revenue).toLocaleString()} RWF</p>
            </div>
            {stats.byStatus.map((s) => (
              <div key={s.status} className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">{STATUS_LABELS[s.status] ?? s.status}</p>
                <p className="text-lg font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">All payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending_cash">Cash Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={mosqueFilter}
            onChange={(e) => { setMosqueFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">All mosques</option>
            {mosques.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="ml-2 text-gray-500">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No requests found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">Applicant</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Reason</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Payment</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{req.fullNames}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{req.phone}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600">
                        {MOTIF_LABELS[req.motif] ?? req.motif}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-4">
                        <PaymentBadge status={req.paymentStatus} />
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${locale}/admin/good-conduct/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} requests
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-indigo-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-indigo-300 transition-colors"
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

export default function AdminGoodConductPage() {
  return (
    <ProtectedRoute permissions={[Permission.GOOD_CONDUCT_VIEW]}>
      <AdminGoodConductContent />
    </ProtectedRoute>
  );
}
