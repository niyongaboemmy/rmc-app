'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search, GraduationCap, ChevronRight, RefreshCw,
  Users, Clock, CheckCircle2, Download, BarChart2, Plus, Pencil, Trash2, X,
} from 'lucide-react';
import {
  type ScholarshipApplication, type ScholarshipApplicationStatus, type ScholarshipProgram,
  STATUS_COLORS,
} from '@/lib/scholarshipApi';
import {
  scholarshipAdminApi, type AdminScholarshipStats, type CreateScholarshipProgramPayload,
} from '@/lib/scholarshipAdminApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'confirmed', label: 'Confirmed' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
};

const LEVEL_LABELS: Record<string, string> = {
  secondary: 'Secondary School',
  tvet: 'TVET / Vocational',
  university: 'University',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_COLORS[status as ScholarshipApplicationStatus] ?? 'bg-gray-100 text-gray-700',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Program form modal ──────────────────────────────────────────────────────

function ProgramModal({
  program,
  onClose,
  onSaved,
}: {
  program: ScholarshipProgram | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(program?.title ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [level, setLevel] = useState(program?.level ?? '');
  const [amount, setAmount] = useState(program?.amount != null ? String(program.amount) : '');
  const [deadline, setDeadline] = useState(
    program?.deadline ? program.deadline.slice(0, 10) : '',
  );
  const [isOpen, setIsOpen] = useState(program?.isOpen ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload: CreateScholarshipProgramPayload = {
      title: title.trim(),
      description: description.trim(),
      level: (level || undefined) as CreateScholarshipProgramPayload['level'],
      amount: amount ? Number(amount) : undefined,
      deadline: deadline || undefined,
      isOpen,
    };
    try {
      if (program) {
        await scholarshipAdminApi.updateProgram(program.id, payload);
      } else {
        await scholarshipAdminApi.createProgram(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Failed to save program',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{program ? 'Edit Program' : 'New Scholarship Program'}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as typeof level)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                <option value="">Any level</option>
                <option value="secondary">Secondary School</option>
                <option value="tvet">TVET / Vocational</option>
                <option value="university">University</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount (RWF)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <label className="inline-flex items-center gap-2 pb-2.5 text-sm text-gray-700">
              <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="rounded" />
              Open for applications
            </label>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Programs tab ─────────────────────────────────────────────────────────────

function ProgramsTab({ canManage }: { canManage: boolean }) {
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScholarshipProgram | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      setPrograms(await scholarshipAdminApi.listPrograms());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scholarship program? This cannot be undone.')) return;
    await scholarshipAdminApi.deleteProgram(id);
    fetchPrograms();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No scholarship programs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Level</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Deadline</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                  {canManage && <th className="px-4 py-3.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {programs.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{p.description}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {p.level ? LEVEL_LABELS[p.level] : 'Any level'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {p.amount != null ? `${Number(p.amount).toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        p.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {p.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditing(p)} aria-label="Edit" className="text-gray-400 hover:text-violet-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} aria-label="Delete" className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(editing || creating) && (
        <ProgramModal
          program={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={fetchPrograms}
        />
      )}
    </div>
  );
}

// ── Applications tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ permReports }: { permReports: boolean }) {
  const { locale } = useParams<{ locale: string }>();

  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminScholarshipStats | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await scholarshipAdminApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setApplications(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, page]);

  const fetchStats = useCallback(async () => {
    if (!permReports) return;
    try {
      setStats(await scholarshipAdminApi.getReports());
    } catch { /* ignore if no permission */ }
  }, [permReports]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const submitted = stats?.byStatus.find((s) => s.status === 'submitted')?.count ?? '0';
  const underReview = stats?.byStatus.find((s) => s.status === 'under_review')?.count ?? '0';
  const confirmed = stats?.byStatus.find((s) => s.status === 'confirmed')?.count ?? '0';

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await scholarshipAdminApi.exportCsv({
        search: search || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scholarship-applications.csv';
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
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Awaiting Review', value: submitted, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Under Review', value: underReview, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50' },
            { label: 'Confirmed', value: confirmed, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
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

      {permReports && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowReports((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
          >
            <BarChart2 className="w-4 h-4" /> {showReports ? 'Hide Reports' : 'Reports'}
          </button>
        </div>
      )}

      {showReports && permReports && stats && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-violet-500" /> Reports
            </h3>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
            <span className="ml-2 text-gray-500">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No applications found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">Applicant</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Application #</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">School</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-violet-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{app.fullNames}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{app.phone}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 font-mono">
                        {app.applicationNumber}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600">{app.schoolName}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${locale}/admin/scholarship/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
                        >
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} applications
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-violet-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-violet-300 transition-colors"
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

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminScholarshipContent() {
  const { hasPermission } = useAuth();
  const permManage = hasPermission(Permission.SCHOLARSHIP_MANAGE);
  const permReports = hasPermission(Permission.SCHOLARSHIP_REPORTS);
  const [tab, setTab] = useState<'applications' | 'programs'>('applications');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-violet-600" />
            Scholarships
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage scholarship programs and review applications</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(['applications', 'programs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'applications' ? 'Applications' : 'Programs'}
          </button>
        ))}
      </div>

      {tab === 'applications' ? (
        <ApplicationsTab permReports={permReports} />
      ) : (
        <ProgramsTab canManage={permManage} />
      )}
    </div>
  );
}

export default function AdminScholarshipPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_VIEW]}>
      <AdminScholarshipContent />
    </ProtectedRoute>
  );
}
