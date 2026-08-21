'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GraduationCap, User, Phone, Mail, MapPin, School,
  FileText, Users, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, Search, Award, X, Paperclip, Download, ShieldCheck, Loader2,
} from 'lucide-react';
import { type ScholarshipApplication, type ScholarshipDocument, STATUS_COLORS } from '@/lib/scholarshipApi';
import type { AdminScholarshipApplication } from '@/lib/scholarshipAdminApi';
import { scholarshipAdminApi } from '@/lib/scholarshipAdminApi';
import { publicApi } from '@/lib/public-api';
import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

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

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: 'Parent',
  guardian: 'Guardian',
  sibling: 'Sibling',
  other: 'Other',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  transcript: 'Transcript / Report Card',
  academic_record: 'Academic Record',
  proof: 'Proof of Need',
  additional: 'Other Document',
};

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({
  doc,
  requirementLabel,
  canManage,
  verifying,
  onVerify,
}: {
  doc: ScholarshipDocument;
  /** Human label of the scholarship requirement this file answers, if any. */
  requirementLabel?: string;
  canManage: boolean;
  verifying: boolean;
  onVerify: () => void;
}) {
  const url = fileUrl(doc.fileKey);
  const isImage = doc.mimeType.startsWith('image/');
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 overflow-hidden flex flex-col">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block relative h-28 bg-white group">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={doc.fileName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
            <FileText className="w-8 h-8" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {doc.fileName.split('.').pop() || 'file'}
            </span>
          </div>
        )}
        {doc.verified && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        )}
      </a>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 truncate" title={doc.fileName}>{doc.fileName}</p>
          {/* The requirement it answers, when it answers one. `documentType` is
              a four-value label, so two "Additional" files were previously
              indistinguishable on this screen (migration 055). */}
          <p className="text-xs text-gray-400">
            {requirementLabel ?? DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
            {' · '}
            {formatFileSize(doc.fileSize)}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-rmc-green hover:text-rmc-green-dark transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Open
          </a>
          {canManage && (
            <button
              onClick={onVerify}
              disabled={verifying}
              className={cn(
                'ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50',
                doc.verified
                  ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                  : 'border-gray-200 text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green-dark',
              )}
            >
              {verifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {doc.verified ? 'Verified' : 'Mark verified'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
        STATUS_COLORS[status as ScholarshipApplication['status']] ?? 'bg-gray-100 text-gray-700',
      )}
    >
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
        <span className="text-rmc-green">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

interface ActionModalProps {
  title: string;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  placeholder?: string;
  required?: boolean;
  confirmLabel?: string;
  confirmClass?: string;
}

function ActionModal({ title, onClose, onConfirm, placeholder, required, confirmLabel = 'Confirm', confirmClass }: ActionModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (required && !notes.trim()) {
      setError('This field is required.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(notes);
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? 'Action failed',
      );
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="action-modal-title" className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 id="action-modal-title" className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setError(''); }}
          placeholder={placeholder ?? 'Notes (optional)'}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50', confirmClass ?? 'bg-rmc-green hover:bg-rmc-green-dark')}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AdminScholarshipDetailContent() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const { hasPermission } = useAuth();
  const permApprove = hasPermission(Permission.SCHOLARSHIP_APPROVE);
  const permManage = hasPermission(Permission.SCHOLARSHIP_MANAGE);

  const [application, setApplication] = useState<AdminScholarshipApplication | null>(null);

  /**
   * The scholarship's declared documents, keyed for lookup, plus whatever is
   * still outstanding. Both derive from the SAME list the applicant was shown,
   * so the review screen and the form can never disagree about what was asked.
   */
  const requirementLabels: Record<string, string> = {};
  for (const req of application?.program?.requiredDocuments ?? []) {
    requirementLabels[req.key] = req.label?.en?.trim() || req.key;
  }
  const attachedKeys = new Set(
    (application?.documents ?? []).map((d) => d.requirementKey).filter(Boolean) as string[],
  );
  const missingRequired = (application?.program?.requiredDocuments ?? [])
    .filter((req) => req.required !== false && !attachedKeys.has(req.key))
    .map((req) => requirementLabels[req.key]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const actionLoading = activeAction !== null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      setApplication(await scholarshipAdminApi.getOne(id));
    } catch {
      setActionError('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchApplication(); }, [fetchApplication]);

  useEffect(() => {
    if (!application?.districtId) { setDistrictName(null); return; }
    publicApi.getDistricts().then((ds) => {
      setDistrictName(ds.find((d) => d.id === application.districtId)?.name ?? null);
    }).catch(() => setDistrictName(null));
  }, [application?.districtId]);

  const handleStatusUpdate = async (
    action: 'start_review' | 'approve' | 'reject' | 'confirm',
    payload: { notes?: string; reason?: string } = {},
  ) => {
    setActiveAction(action);
    setActionError(null);
    try {
      const updated = await scholarshipAdminApi.updateStatus(id, { action, ...payload });
      setApplication(updated);
      setSuccessMsg(`Status updated to ${STATUS_LABELS[updated.status]}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setActionError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? 'Action failed',
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleVerifyDoc = async (docId: string, verified: boolean) => {
    setActiveAction(`verify-${docId}`);
    setActionError(null);
    try {
      const updated = await scholarshipAdminApi.verifyDocument(id, docId, verified);
      setApplication(updated);
    } catch {
      setActionError('Failed to update document verification');
    } finally {
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Application not found.</p>
      </div>
    );
  }

  const needsReview = application.status === 'submitted';
  const needsDecision = application.status === 'under_review';
  const canConfirm = application.status === 'approved';
  const residence = [districtName, application.cell, application.village].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/${locale}/admin/scholarship`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to applications
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-rmc-green-dark" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{application.fullNames}</h1>
            <p className="text-xs text-gray-400 font-mono">{application.applicationNumber}</p>
            {/* WHICH scholarship this answers. Every application targets one now,
                and a reviewer cannot judge it without knowing which call it is
                against — its deadline and criteria are the scholarship's. */}
            {application.program && (
              <p className="mt-1 text-xs text-gray-500">
                Applying to{' '}
                <Link
                  href={`/${locale}/services/scholarship/${application.program.slug ?? application.program.id}`}
                  target="_blank"
                  className="font-semibold text-rmc-green hover:underline"
                >
                  {application.program.title}
                </Link>
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3">{successMsg}</div>
      )}
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{actionError}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Identity" icon={<User className="w-4 h-4" />}>
            <InfoRow label="Full Names" value={application.fullNames} icon={<User className="w-3.5 h-3.5" />} />
            <InfoRow label="Date of Birth" value={application.dateOfBirth} />
            <InfoRow label="Gender" value={application.gender ? (application.gender === 'male' ? 'Male' : 'Female') : null} />
            <InfoRow label="National ID" value={application.nationalId} />
            <InfoRow label="Phone" value={application.phone} icon={<Phone className="w-3.5 h-3.5" />} />
            <InfoRow label="Email" value={application.email} icon={<Mail className="w-3.5 h-3.5" />} />
          </Section>

          <Section title="Residence" icon={<MapPin className="w-4 h-4" />}>
            <InfoRow label="District" value={districtName} icon={<MapPin className="w-3.5 h-3.5" />} />
            <InfoRow label="Cell" value={application.cell} />
            <InfoRow label="Village" value={application.village} />
            {!residence && <p className="text-sm text-gray-400">No residence details provided.</p>}
          </Section>

          <Section title="Education" icon={<School className="w-4 h-4" />}>
            <InfoRow label="School" value={application.schoolName} icon={<School className="w-3.5 h-3.5" />} />
            <InfoRow label="Level" value={LEVEL_LABELS[application.educationLevel] ?? application.educationLevel} />
            <InfoRow label="Current Year" value={application.currentYear} />
            <InfoRow label="Average Grade" value={application.averageGrade} />
          </Section>

          <Section title="Guardian" icon={<Users className="w-4 h-4" />}>
            <InfoRow label="Name" value={application.guardianName} icon={<Users className="w-3.5 h-3.5" />} />
            <InfoRow label="Phone" value={application.guardianPhone} icon={<Phone className="w-3.5 h-3.5" />} />
            <InfoRow label="Relationship" value={RELATIONSHIP_LABELS[application.relationship] ?? application.relationship} />
          </Section>

          <Section title="Motivation" icon={<FileText className="w-4 h-4" />}>
            <p className="text-sm text-gray-700 leading-relaxed">{application.motivation}</p>
          </Section>

          <Section title="Documents" icon={<Paperclip className="w-4 h-4" />}>
            {!application.documents || application.documents.length === 0 ? (
              <p className="text-sm text-gray-400">No documents were attached to this application.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {application.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    requirementLabel={requirementLabels[doc.requirementKey ?? '']}
                    canManage={permManage}
                    verifying={activeAction === `verify-${doc.id}`}
                    onVerify={() => handleVerifyDoc(doc.id, !doc.verified)}
                  />
                ))}
              </div>
            )}

            {/* A required document that never arrived. Worth stating outright —
                otherwise its absence is invisible, and a reviewer would have to
                remember what the scholarship asked for. */}
            {missingRequired.length > 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Not attached: {missingRequired.join(', ')}
              </p>
            )}
          </Section>

          {permApprove && (needsReview || needsDecision || canConfirm) && (
            <Section title="Review Decision" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="flex flex-wrap gap-3">
                {needsReview && (
                  <button
                    onClick={() => handleStatusUpdate('start_review')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {activeAction === 'start_review' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Start Review
                  </button>
                )}
                {needsDecision && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('approve')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {activeAction === 'approve' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => setModal('reject')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {canConfirm && (
                  <button
                    onClick={() => handleStatusUpdate('confirm')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {activeAction === 'confirm' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    Confirm Scholarship
                  </button>
                )}
              </div>
            </Section>
          )}

          {application.statusHistory && application.statusHistory.length > 0 && (
            <Section title="Status History" icon={<Clock className="w-4 h-4" />}>
              <ol className="relative space-y-4">
                {[...application.statusHistory].reverse().map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-rmc-green mt-2 shrink-0" />
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

        <div className="space-y-5">
          {application.programId && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-rmc-green" /> Program
              </h3>
              <p className="text-xs text-gray-400 font-mono">{application.programId}</p>
            </div>
          )}

          {application.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4" /> Rejection Reason
              </h3>
              <p className="text-sm text-red-600">{application.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {modal === 'reject' && (
        <ActionModal
          title="Reject Application"
          onClose={() => setModal(null)}
          onConfirm={(reason) => handleStatusUpdate('reject', { reason })}
          placeholder="Reason for rejection (required)"
          required
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}

export default function AdminScholarshipDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_VIEW]}>
      <AdminScholarshipDetailContent />
    </ProtectedRoute>
  );
}
