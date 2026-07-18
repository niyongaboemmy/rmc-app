'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, User, Phone, Mail, MapPin, FileText,
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Send, X,
  Star, Search, ShieldCheck, ExternalLink, Download,
} from 'lucide-react';
import { type JobApplication, JOB_STATUS_COLORS, type JobApplicationStatus } from '@/lib/jobsApi';
import { jobsAdminApi, type JobStatusAction } from '@/lib/jobsAdminApi';
import { resolveMediaUrl } from '@/lib/mediaUpload';
import { publicApi } from '@/lib/public-api';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

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
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
      JOB_STATUS_COLORS[status as JobApplicationStatus] ?? 'bg-gray-100 text-gray-700',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {icon && <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <span className="text-emerald-500">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function DocLink({ label, name, docKey }: { label: string; name?: string; docKey?: string }) {
  const [downloading, setDownloading] = useState(false);

  const url = docKey ? resolveMediaUrl(docKey) : '';

  // The file-server streams inline, and the <a download> attribute is ignored
  // cross-origin — so fetch the file as a blob and save it with its real name.
  const handleDownload = async () => {
    if (!docKey) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name || docKey.split('/').pop() || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      // Fallback: open in a new tab if the blob download fails
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  if (!docKey) return null;
  return (
    <>
      <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
        <span className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-600" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 truncate">{name || docKey}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          aria-label={`Open ${label} in a new tab`}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
          aria-label={`Download ${label}`}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors shrink-0 disabled:opacity-50"
        >
          {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
}

interface ActionModalProps {
  title: string;
  placeholder: string;
  confirmLabel: string;
  confirmClass: string;
  onClose: () => void;
  onConfirm: (text: string) => Promise<void>;
}

function ActionModal({ title, placeholder, confirmLabel, confirmClass, onClose, onConfirm }: ActionModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!text.trim()) { setError('This field is required.'); return; }
    setLoading(true);
    try {
      await onConfirm(text);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(''); }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50', confirmClass)}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AdminJobDetailContent() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.JOB_APPLICATIONS_MANAGE);

  const [app, setApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [modal, setModal] = useState<'reject' | 'more_info' | null>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const actionLoading = activeAction !== null;

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      setApp(await jobsAdminApi.getOne(id));
    } catch {
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  useEffect(() => {
    if (!app?.districtId) { setDistrictName(null); return; }
    publicApi.getDistricts().then((ds) => {
      setDistrictName(ds.find((d) => d.id === app.districtId)?.name ?? null);
    }).catch(() => setDistrictName(null));
  }, [app?.districtId]);

  const doAction = async (action: JobStatusAction, payload: { notes?: string; reason?: string } = {}) => {
    setActiveAction(action);
    setError(null);
    try {
      const updated = await jobsAdminApi.updateStatus(id, { action, ...payload });
      setApp(updated);
      router.refresh(); // bust the router cache so the list shows the new status
      setSuccessMsg(`Status updated to ${STATUS_LABELS[updated.status]}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Action failed');
    } finally {
      setActiveAction(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" /></div>;
  }
  if (!app) {
    return <div className="text-center py-24"><p className="text-gray-500">Application not found.</p></div>;
  }

  const docs = app.documents;
  const canStartReview = app.status === 'submitted';
  const canDecide = ['under_review', 'shortlisted', 'more_info_requested'].includes(app.status);
  const canShortlist = app.status === 'under_review';
  const residence = [districtName, app.cell, app.village].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <Link href={`/${locale}/admin/jobs`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to applications
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{app.fullNames}</h1>
            <p className="text-xs text-gray-400 font-mono">{app.trackingNumber} · {app.positionAppliedFor}</p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {successMsg && <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3">{successMsg}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Applicant" icon={<User className="w-4 h-4" />}>
            <InfoRow label="Full Names" value={app.fullNames} icon={<User className="w-3.5 h-3.5" />} />
            <InfoRow label="Position applied for" value={app.positionAppliedFor} icon={<Briefcase className="w-3.5 h-3.5" />} />
            <InfoRow label="Phone" value={app.phone} icon={<Phone className="w-3.5 h-3.5" />} />
            <InfoRow label="Email" value={app.email} icon={<Mail className="w-3.5 h-3.5" />} />
            <InfoRow label="Residence" value={residence || undefined} icon={<MapPin className="w-3.5 h-3.5" />} />
          </Section>

          <Section title="Documents" icon={<FileText className="w-4 h-4" />}>
            <DocLink label="Application letter" name={docs.applicationLetter?.name} docKey={docs.applicationLetter?.key} />
            <DocLink label="Curriculum Vitae (CV)" name={docs.cv?.name} docKey={docs.cv?.key} />
            <DocLink label="National ID" name={docs.nationalId?.name} docKey={docs.nationalId?.key} />
            <DocLink label="Criminal record" name={docs.criminalRecord?.name} docKey={docs.criminalRecord?.key} />
            {docs.academicPapers?.map((p, i) => (
              <DocLink key={i} label={`Academic paper ${i + 1}`} name={p.name} docKey={p.key} />
            ))}
            {docs.goodConductCertificateNumber && (
              <InfoRow label="Good conduct certificate №" value={docs.goodConductCertificateNumber} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
            )}
            <DocLink label="Good conduct certificate" name={docs.goodConductCertificate?.name} docKey={docs.goodConductCertificate?.key} />
            <DocLink label="Employer recommendation" name={docs.employerRecommendation?.name} docKey={docs.employerRecommendation?.key} />
            {docs.additionalDocuments?.map((d, i) => (
              <DocLink key={`add-${i}`} label={`Additional document ${i + 1} (applicant response)`} name={d.name} docKey={d.key} />
            ))}
          </Section>

          {app.statusHistory && app.statusHistory.length > 0 && (
            <Section title="Status History" icon={<Clock className="w-4 h-4" />}>
              <ol className="relative space-y-4">
                {[...app.statusHistory].reverse().map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → ` : ''}
                        {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                      </p>
                      {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(h.changedAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>

        {/* Decision panel */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-emerald-500" /> Review Decision
            </h3>

            {!canManage ? (
              <p className="text-xs text-gray-400">You don&apos;t have permission to change this application&apos;s status.</p>
            ) : !canStartReview && !canDecide ? (
              <p className="text-xs text-gray-400">This application is {STATUS_LABELS[app.status]?.toLowerCase()} — no further action needed.</p>
            ) : (
              <div className="space-y-2.5">
                {canStartReview && (
                  <button onClick={() => doAction('start_review')} disabled={actionLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                    {activeAction === 'start_review' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Start Review
                  </button>
                )}
                {canShortlist && (
                  <button onClick={() => doAction('shortlist')} disabled={actionLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                    {activeAction === 'shortlist' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />} Shortlist
                  </button>
                )}
                {canDecide && (
                  <>
                    <button onClick={() => setConfirmAccept(true)} disabled={actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                      {activeAction === 'accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Accept / Approve
                    </button>
                    <button onClick={() => setModal('reject')} disabled={actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => setModal('more_info')} disabled={actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                      <Send className="w-4 h-4" /> Request More Info
                    </button>
                  </>
                )}
              </div>
            )}

            {app.rejectionReason && (
              <p className="text-xs text-red-600 mt-3"><strong>Rejection reason:</strong> {app.rejectionReason}</p>
            )}
            {app.moreInfoRequested && (
              <p className="text-xs text-amber-600 mt-3"><strong>Info requested:</strong> {app.moreInfoRequested}</p>
            )}
          </div>
        </div>
      </div>

      {modal === 'reject' && (
        <ActionModal
          title="Reject Application"
          placeholder="Reason for rejection (required)"
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
          onClose={() => setModal(null)}
          onConfirm={(reason) => doAction('reject', { reason })}
        />
      )}
      {modal === 'more_info' && (
        <ActionModal
          title="Request More Information"
          placeholder="What information is needed? (required)"
          confirmLabel="Send Request"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          onClose={() => setModal(null)}
          onConfirm={(notes) => doAction('request_more_info', { notes })}
        />
      )}

      {confirmAccept && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !actionLoading && setConfirmAccept(false)}
          className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Approve this application?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This marks <strong>{app.fullNames}</strong>&apos;s application for <strong>{app.positionAppliedFor}</strong> as <strong>Accepted</strong> and notifies the applicant.
                </p>
              </div>
              <button onClick={() => setConfirmAccept(false)} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAccept(false)} disabled={actionLoading} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => { setConfirmAccept(false); doAction('accept'); }} disabled={actionLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function AdminJobDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.JOB_APPLICATIONS_VIEW]}>
      <AdminJobDetailContent />
    </ProtectedRoute>
  );
}
