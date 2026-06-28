'use client';

import { useEffect, useState, useCallback } from 'react';
import { ModalPortal } from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

interface MemberRow {
  id: string;
  membershipNumber: string;
  category: string;
  approvalStatus: string;
  memberStatus: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface MembersResponse {
  data: MemberRow[];
  total: number;
  page: number;
  pages: number;
}

type ApprovalStatus = 'all' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    approved: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    suspended: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${classes[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AdminMembersContent() {
  const t = useTranslations('admin.members');
  const { hasPermission } = useAuth();
  const canApprove = hasPermission(Permission.MEMBERS_APPROVE);
  const canDownloadIdCard = hasPermission(Permission.MEMBERS_ID_CARD);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('all');
  const [approvalModal, setApprovalModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.approvalStatus = statusFilter;
      const res = await apiClient.get<{ data: MembersResponse }>('/members', { params });
      const result = res.data.data;
      setMembers(result.data);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.put(`/members/${id}/approve`, { action: 'approve' });
      await fetchMembers();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.put(`/members/${id}/approve`, { action: 'reject', reason: rejectReason });
      setApprovalModal(null);
      setRejectReason('');
      await fetchMembers();
    } finally {
      setActionLoading(false);
    }
  };

  const downloadIdCard = (id: string) => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/members/${id}/id-card`,
      '_blank',
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{total} total members</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={t('search')}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-rmc-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Membership #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-gray-100 rounded" />
                      </td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {m.user?.firstName} {m.user?.lastName}
                        </div>
                        <div className="text-gray-400 text-xs">{m.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-rmc-green text-xs">{m.membershipNumber}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{m.category}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.approvalStatus} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.approvalStatus === 'pending' && canApprove && (
                            <>
                              <button
                                onClick={() => handleApprove(m.id)}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                {t('approve')}
                              </button>
                              <button
                                onClick={() => setApprovalModal({ id: m.id, name: `${m.user?.firstName} ${m.user?.lastName}` })}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200 transition-colors"
                              >
                                {t('reject')}
                              </button>
                            </>
                          )}
                          {m.approvalStatus === 'approved' && canDownloadIdCard && (
                            <button
                              onClick={() => downloadIdCard(m.id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                            >
                              ID Card
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {pages} — {total} total
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rejection modal */}
        <ModalPortal>
        {approvalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99990] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="font-bold text-gray-900 mb-2">Reject Application</h3>
              <p className="text-gray-500 text-sm mb-4">
                Rejecting: <strong>{approvalModal.name}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reason')}</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rmc-green outline-none resize-none"
                placeholder="Provide reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setApprovalModal(null); setRejectReason(''); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(approvalModal.id)}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? '...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
        </ModalPortal>
    </div>
  );
}

export default function AdminMembersPage() {
  return (
    <ProtectedRoute permissions={[Permission.MEMBERS_VIEW]}>
      <AdminMembersContent />
    </ProtectedRoute>
  );
}
