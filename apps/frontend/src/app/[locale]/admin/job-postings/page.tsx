'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import {
  Briefcase, Plus, RefreshCw, Inbox, X, Pencil, Trash2, Eye, EyeOff, Users, AlertTriangle,
} from 'lucide-react';
import {
  jobPostingsAdminApi,
  EMPLOYMENT_TYPE_LABELS,
  type JobPosting,
  type EmploymentType,
  type CreateJobPostingPayload,
} from '@/lib/jobPostingsApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', open: 'Open', closed: 'Closed' };
const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contract', 'internship', 'volunteer'];

type FormState = CreateJobPostingPayload;
const EMPTY_FORM: FormState = {
  title: '', department: '', employmentType: 'full_time', location: '',
  description: '', responsibilities: '', requirements: '',
  numberOfPositions: 1, salaryRange: '', applicationDeadline: '', status: 'draft',
};

function AdminPostingsContent() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.JOB_APPLICATIONS_MANAGE);

  const [items, setItems] = useState<JobPosting[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<JobPosting | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await jobPostingsAdminApi.list({ status: statusFilter || undefined }));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const toggleStatus = async (p: JobPosting) => {
    setBusyId(p.id);
    setError(null);
    try {
      if (p.status === 'open') await jobPostingsAdminApi.close(p.id);
      else await jobPostingsAdminApi.publish(p.id);
      await fetchList();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await jobPostingsAdminApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await fetchList();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not delete this posting.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-xs text-gray-400">{items.length} posting{items.length === 1 ? '' : 's'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          {canManage && (
            <button onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> New posting
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">No job postings yet.</p>
            {canManage && (
              <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                <Plus className="w-4 h-4" /> Create your first posting
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="font-medium px-5 py-3">Title</th>
                  <th className="font-medium px-5 py-3">Type</th>
                  <th className="font-medium px-5 py-3">Status</th>
                  <th className="font-medium px-5 py-3">Applications</th>
                  <th className="font-medium px-5 py-3">Deadline</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400">{[p.department, p.location].filter(Boolean).join(' · ') || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{EMPLOYMENT_TYPE_LABELS[p.employmentType]}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', STATUS_STYLES[p.status])}>{STATUS_LABELS[p.status]}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-gray-600"><Users className="w-3.5 h-3.5 text-gray-400" /> {p.applicationsCount ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {p.applicationDeadline ? new Date(p.applicationDeadline).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManage && (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button onClick={() => setEditing(p)} title="Edit"
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleStatus(p)} disabled={busyId === p.id}
                            title={p.status === 'open' ? 'Close (stop accepting)' : 'Publish (open)'}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors disabled:opacity-50">
                            {busyId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : p.status === 'open' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setDeleteTarget(p); setError(null); }} title="Delete"
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <PostingFormModal
          posting={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchList(); }}
        />
      )}

      {deleteTarget && createPortal(
        <div role="dialog" aria-modal="true" onClick={() => busyId === null && setDeleteTarget(null)}
          className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Delete posting?</h3>
                <p className="text-sm text-gray-500 mt-1">This permanently deletes <strong>{deleteTarget.title}</strong>. Postings that already have applications can’t be deleted — close them instead.</p>
              </div>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={busyId !== null} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={busyId !== null} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {busyId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function PostingFormModal({ posting, onClose, onSaved }: { posting: JobPosting | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!posting;
  const [form, setForm] = useState<FormState>(() =>
    posting
      ? {
          title: posting.title, department: posting.department ?? '', employmentType: posting.employmentType,
          location: posting.location ?? '', description: posting.description, responsibilities: posting.responsibilities ?? '',
          requirements: posting.requirements ?? '', numberOfPositions: posting.numberOfPositions,
          salaryRange: posting.salaryRange ?? '',
          applicationDeadline: posting.applicationDeadline ? posting.applicationDeadline.slice(0, 10) : '',
          status: posting.status,
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || form.description.trim().length < 10) {
      setErr('A title and a description (at least 10 characters) are required.');
      return;
    }
    setSaving(true);
    setErr(null);
    const payload: CreateJobPostingPayload = {
      ...form,
      department: form.department || undefined,
      location: form.location || undefined,
      responsibilities: form.responsibilities || undefined,
      requirements: form.requirements || undefined,
      salaryRange: form.salaryRange || undefined,
      applicationDeadline: form.applicationDeadline || undefined,
    };
    try {
      if (isEdit && posting) await jobPostingsAdminApi.update(posting.id, payload);
      else await jobPostingsAdminApi.create(payload);
      onSaved();
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setErr(Array.isArray(m) ? m.join(', ') : m ?? 'Could not save the posting.');
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
  const lbl = 'block text-xs font-semibold text-gray-600 mb-1.5';

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" onClick={() => !saving && onClose()}
      className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900">{isEdit ? 'Edit posting' : 'New job posting'}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className={lbl}>Job title <span className="text-red-500">*</span></label>
            <input className={input} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} placeholder="e.g. Senior Accountant" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Department</label><input className={input} value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Finance" /></div>
            <div><label className={lbl}>Employment type</label>
              <select className={input} value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Location</label><input className={input} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kigali" /></div>
            <div><label className={lbl}>Salary range</label><input className={input} value={form.salaryRange} onChange={(e) => set('salaryRange', e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Number of positions</label><input type="number" min={1} className={input} value={form.numberOfPositions} onChange={(e) => set('numberOfPositions', Number(e.target.value))} /></div>
            <div><label className={lbl}>Application deadline</label><input type="date" className={input} value={form.applicationDeadline} onChange={(e) => set('applicationDeadline', e.target.value)} /></div>
          </div>
          <div>
            <label className={lbl}>Description <span className="text-red-500">*</span></label>
            <textarea rows={4} className={cn(input, 'resize-none')} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What the role is about…" />
          </div>
          <div>
            <label className={lbl}>Responsibilities</label>
            <textarea rows={3} className={cn(input, 'resize-none')} value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={lbl}>Requirements</label>
            <textarea rows={3} className={cn(input, 'resize-none')} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select className={input} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft (hidden from applicants)</option>
              <option value="open">Open (accepting applications)</option>
              {isEdit && <option value="closed">Closed (not accepting)</option>}
            </select>
          </div>
          {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">{err}</div>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />} {isEdit ? 'Save changes' : 'Create posting'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AdminJobPostingsPage() {
  return (
    <ProtectedRoute permissions={[Permission.JOB_APPLICATIONS_VIEW]}>
      <AdminPostingsContent />
    </ProtectedRoute>
  );
}
