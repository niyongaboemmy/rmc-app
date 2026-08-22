'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, User, Phone, Mail, MapPin, FileText,
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Send, X,
  Star, Search, ShieldCheck, ExternalLink, Download,
  type LucideIcon,
} from 'lucide-react';
import { type JobApplication, JOB_STATUS_COLORS, type JobApplicationStatus } from '@/lib/jobsApi';
import { jobsAdminApi, type JobStatusAction } from '@/lib/jobsAdminApi';
import { REQUESTABLE_JOB_DOCUMENTS, requestedDocumentLabel } from '@/lib/jobWorkflow';
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
        <span className="text-rmc-green">{icon}</span>
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
        <span className="w-9 h-9 rounded-lg bg-rmc-green-light flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-rmc-green" />
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
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rmc-green hover:border-rmc-green transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
          aria-label={`Download ${label}`}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rmc-green hover:border-rmc-green transition-colors shrink-0 disabled:opacity-50"
        >
          {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
}

/**
 * Every status change goes through one dialog.
 *
 * There used to be three ways to commit an action: `start_review` and `shortlist` fired
 * straight from the button, `accept` opened a hand-rolled confirm portal, and `reject` /
 * `more_info` opened a notes modal. So two of the five were irreversible on a single
 * mis-click, and the other three each looked different at the moment of deciding.
 *
 * `note` is what separates them now — a spec that declares one collects a required
 * message in the same step; a spec without one is a plain "are you sure".
 */
type ActionTone = 'primary' | 'positive' | 'danger';

interface ActionSpec {
  action: JobStatusAction;
  label: string;
  icon: LucideIcon;
  tone: ActionTone;
  confirmTitle: string;
  confirmBody: string;
  confirmCta: string;
  /** Collect a required note in the confirm step, sent as this field. */
  note?: { label: string; placeholder: string; field: 'notes' | 'reason' };
}

const TONES: Record<ActionTone, { solid: string; soft: string; ring: string }> = {
  primary: {
    solid: 'bg-rmc-green hover:bg-rmc-green-dark text-white',
    soft: 'border-gray-200 text-gray-700 hover:border-rmc-green hover:text-rmc-green',
    ring: 'bg-rmc-green/10 text-rmc-green',
  },
  positive: {
    solid: 'bg-green-600 hover:bg-green-700 text-white',
    soft: 'border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600',
    ring: 'bg-green-50 text-green-600',
  },
  danger: {
    solid: 'bg-red-600 hover:bg-red-700 text-white',
    soft: 'border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600',
    ring: 'bg-red-50 text-red-600',
  },
};

const ACTIONS: Record<string, ActionSpec> = {
  start_review: {
    action: 'start_review', label: 'Start Review', icon: Search, tone: 'primary',
    confirmTitle: 'Start reviewing this application?',
    confirmBody: 'It moves out of the submitted queue and into review. The applicant is not notified.',
    confirmCta: 'Start review',
  },
  shortlist: {
    action: 'shortlist', label: 'Shortlist', icon: Star, tone: 'primary',
    confirmTitle: 'Shortlist this applicant?',
    confirmBody: 'They move to the shortlist column. You can still accept or reject them afterwards.',
    confirmCta: 'Shortlist',
  },
  accept: {
    action: 'accept', label: 'Accept / Approve', icon: CheckCircle2, tone: 'positive',
    confirmTitle: 'Accept this applicant?',
    confirmBody: 'This is the final decision and the applicant is notified. It cannot be undone from here.',
    confirmCta: 'Accept applicant',
  },
  reject: {
    action: 'reject', label: 'Reject', icon: XCircle, tone: 'danger',
    confirmTitle: 'Reject this application?',
    confirmBody: 'The applicant is notified, and the reason below is sent to them.',
    confirmCta: 'Reject',
    note: { label: 'Reason for rejection', placeholder: 'Explain why this application was not successful…', field: 'reason' },
  },
};

/** One action button. Never commits — it only opens the confirm step. */
function ActionButton({
  spec,
  onPick,
  busy,
  active,
  variant = 'solid',
}: {
  spec: ActionSpec;
  onPick: (spec: ActionSpec) => void;
  busy: boolean;
  active: string | null;
  variant?: 'solid' | 'soft';
}) {
  const tone = TONES[spec.tone];
  const Icon = spec.icon;
  const running = active === spec.action;
  return (
    <button
      type="button"
      onClick={() => onPick(spec)}
      disabled={busy}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50',
        variant === 'solid' ? tone.solid : cn('border', tone.soft),
      )}
    >
      {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {spec.label}
    </button>
  );
}

/** The single confirm step. Renders a note field only when the spec asks for one. */
function ConfirmActionDialog({
  spec,
  onClose,
  onConfirm,
}: {
  spec: ActionSpec;
  onClose: () => void;
  onConfirm: (payload: { notes?: string; reason?: string }) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tone = TONES[spec.tone];
  const Icon = spec.icon;

  const submit = async () => {
    if (spec.note && !text.trim()) { setError('This field is required.'); return; }
    setLoading(true);
    try {
      await onConfirm(spec.note ? { [spec.note.field]: text } : {});
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
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone.ring)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900">{spec.confirmTitle}</h3>
            <p className="mt-1 text-sm text-gray-500">{spec.confirmBody}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {spec.note && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{spec.note.label}</label>
            <textarea
              rows={4}
              value={text}
              autoFocus
              onChange={(e) => { setText(e.target.value); setError(''); }}
              placeholder={spec.note.placeholder}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
            />
          </div>
        )}

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className={cn('flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50', tone.solid)}>
            {loading ? 'Processing…' : spec.confirmCta}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * "Request more info", as a checklist rather than a paragraph.
 *
 * The old modal was one free-text box, so "please send your CV and a criminal record"
 * arrived as prose the applicant had to parse, against a reply form with a single generic
 * attachment slot — nothing tied a file to the thing that was missing. Ticking the
 * documents here gives their form one upload control per item, and gives the reviewer a
 * list to check the reply against.
 *
 * The message stays required: a checklist says WHAT is missing but never why, and
 * "Academic papers" alone does not tell someone their scan was unreadable.
 */
function RequestMoreInfoDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (payload: { notes: string; documents: string[] }) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key: string) =>
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const submit = async () => {
    if (!notes.trim()) { setError('Tell the applicant what is needed.'); return; }
    setLoading(true);
    try {
      await onConfirm({ notes, documents: picked });
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
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-rmc-green">
            <Send className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900">Request more information</h3>
            <p className="mt-1 text-sm text-gray-500">
              The applicant is notified and the application moves to “More info requested”.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          What is needed? <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          autoFocus
          onChange={(e) => { setNotes(e.target.value); setError(''); }}
          placeholder="e.g. Your CV is missing the last two years, and the ID scan is unreadable."
          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
        />

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-gray-700">
            Documents to upload <span className="font-normal text-gray-400">— optional</span>
          </legend>
          <p className="mb-2 mt-0.5 text-xs text-gray-400">
            Tick any file the applicant must send. Their form shows one upload box per tick.
          </p>
          <div className="space-y-1">
            {REQUESTABLE_JOB_DOCUMENTS.map((doc) => (
              <label
                key={doc.key}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                  picked.includes(doc.key)
                    ? 'border-rmc-green bg-rmc-green/5 text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                <input
                  type="checkbox"
                  checked={picked.includes(doc.key)}
                  onChange={() => toggle(doc.key)}
                  className="h-4 w-4 rounded border-gray-300 text-rmc-green focus:ring-rmc-green"
                />
                {doc.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className="flex-1 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50">
            {loading ? 'Sending…' : picked.length ? `Send request (${picked.length} document${picked.length === 1 ? '' : 's'})` : 'Send request'}
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
  /** The action awaiting confirmation. One dialog serves every one of them. */
  const [pending, setPending] = useState<ActionSpec | null>(null);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
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

  const doAction = async (
    action: JobStatusAction,
    payload: { notes?: string; reason?: string; documents?: string[] } = {},
  ) => {
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
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 text-rmc-green animate-spin" /></div>;
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
          <div className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-rmc-green-dark" />
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

        {/* Decision panel */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-rmc-green" /> Review Decision
            </h3>

            {!canManage ? (
              <p className="text-xs text-gray-400">You don&apos;t have permission to change this application&apos;s status.</p>
            ) : !canStartReview && !canDecide ? (
              <p className="text-xs text-gray-400">This application is {STATUS_LABELS[app.status]?.toLowerCase()} — no further action needed.</p>
            ) : (
              <div className="space-y-3">
                {/* Advancing actions first, as one group. These move the application
                    forward and are the common path. */}
                <div className="space-y-2">
                  {canStartReview && <ActionButton spec={ACTIONS.start_review} onPick={setPending} busy={actionLoading} active={activeAction} />}
                  {canShortlist && <ActionButton spec={ACTIONS.shortlist} onPick={setPending} busy={actionLoading} active={activeAction} />}
                  {canDecide && <ActionButton spec={ACTIONS.accept} onPick={setPending} busy={actionLoading} active={activeAction} />}
                </div>

                {canDecide && (
                  <>
                    {/* Asking for more is not a decision, so it reads as secondary. */}
                    <button
                      type="button"
                      onClick={() => setMoreInfoOpen(true)}
                      disabled={actionLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-rmc-green hover:text-rmc-green disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Request More Info
                    </button>

                    {/* Reject sits under a rule and is outlined, not filled. It used to be
                        a solid red block the same size and weight as Accept directly above
                        it — two irreversible opposites competing for the same glance. */}
                    <div className="border-t border-gray-100 pt-3">
                      <ActionButton spec={ACTIONS.reject} onPick={setPending} busy={actionLoading} active={activeAction} variant="soft" />
                    </div>
                  </>
                )}
              </div>
            )}

            {app.rejectionReason && (
              <p className="text-xs text-red-600 mt-3"><strong>Rejection reason:</strong> {app.rejectionReason}</p>
            )}
            {app.moreInfoRequested && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs text-amber-700">
                  <strong>Info requested:</strong> {app.moreInfoRequested}
                </p>
                {/* The checklist the applicant was given, ticked off as replies arrive.
                    It outlives the reply on purpose: a reply may be partial, so this is
                    what shows a reviewer which of the documents they asked for are still
                    missing. A fresh request replaces the list. */}
                {app.moreInfoDocuments && app.moreInfoDocuments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {app.moreInfoDocuments.map((key) => {
                      // Answered when a reply document carries this slot. The applicant
                      // may send them one at a time, so the list shows what is still
                      // outstanding rather than assuming a reply settles everything.
                      const answered = (app.documents.additionalDocuments ?? []).some(
                        (d) => d.slot === key,
                      );
                      return (
                        <li
                          key={key}
                          className={cn(
                            'flex items-center gap-1.5 text-[11px]',
                            answered ? 'text-green-700' : 'text-amber-700',
                          )}
                        >
                          {answered
                            ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                            : <FileText className="h-3 w-3 shrink-0" />}
                          <span className={answered ? 'line-through decoration-green-700/40' : undefined}>
                            {requestedDocumentLabel(key)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {moreInfoOpen && (
        <RequestMoreInfoDialog
          onClose={() => setMoreInfoOpen(false)}
          onConfirm={({ notes, documents }) => doAction('request_more_info', { notes, documents })}
        />
      )}

      {pending && (
        <ConfirmActionDialog
          spec={pending}
          onClose={() => setPending(null)}
          onConfirm={(payload) => doAction(pending.action, payload)}
        />
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
