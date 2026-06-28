'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Heart,
  User,
  Fingerprint,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Users,
  Shield,
  DollarSign,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Clock,
  RefreshCw,
  Send,
  Banknote,
  X,
  Camera,
  ImageIcon,
  Eye,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Mail,
  ShieldCheck,
  CheckCheck,
  Smartphone,
  FileSignature,
} from 'lucide-react';
import { fileUrl } from '@/lib/api';
import axios from 'axios';
import { FILE_SERVER_URL } from '@/lib/api';
import {
  marriageApi,
  type MarriageApplication,
  type MarriageApplicationStatus,
  STATUS_COLORS,
} from '@/lib/marriageApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

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
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
        STATUS_COLORS[status as MarriageApplicationStatus] ?? 'bg-gray-100 text-gray-700',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <span className="text-rose-500">{icon}</span>
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

function ActionModal({
  title,
  onClose,
  onConfirm,
  placeholder,
  required,
  confirmLabel = 'Confirm',
  confirmClass,
}: ActionModalProps) {
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
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Action failed',
      );
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setError('');
          }}
          placeholder={placeholder ?? 'Notes (optional)'}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50',
              confirmClass ?? 'bg-rose-600 hover:bg-rose-700',
            )}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  groom_id: "Groom's National ID",
  bride_id: "Bride's National ID",
  wali_consent: 'Wali Consent Letter',
  mahr_agreement: 'Mahr Agreement',
  portrait: 'Portrait Photo',
  additional: 'Additional Document',
};

// Document types the applicant is expected to provide (mirrors the public wizard).
const EXPECTED_DOCS: { type: string; required: boolean }[] = [
  { type: 'groom_id', required: true },
  { type: 'bride_id', required: true },
  { type: 'portrait', required: true },
  { type: 'wali_consent', required: false },
];

interface LightboxDoc {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  verified: boolean;
}

interface LightboxProps {
  docs: LightboxDoc[];
  index: number;
  onClose: () => void;
  onVerify: (docId: string, verified: boolean) => void;
  verifyingId: string | null;
}

function Lightbox({ docs, index: initialIndex, onClose, onVerify, verifyingId }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = docs[index];
  const isImage = current.mimeType.startsWith('image/');
  const verifying = verifyingId === current.id;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, docs.length - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [docs.length, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-sm font-medium truncate max-w-xs">{current.name}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerify(current.id, !current.verified);
            }}
            disabled={verifying}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
              current.verified
                ? 'bg-green-500/90 hover:bg-green-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white',
            )}
          >
            {verifying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : current.verified ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            {current.verified ? 'Verified' : 'Mark verified'}
          </button>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev */}
        {index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.name}
            className="max-h-full max-w-full object-contain rounded-lg select-none"
          />
        ) : (
          <iframe
            src={current.url}
            title={current.name}
            className="w-full h-full rounded-lg bg-white"
          />
        )}

        {/* Next */}
        {index < docs.length - 1 && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {docs.length > 1 && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 py-3 px-4 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {docs.map((d, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                'w-12 h-12 rounded-lg shrink-0 overflow-hidden border-2 transition-all',
                i === index ? 'border-white scale-110' : 'border-white/20 hover:border-white/50',
              )}
            >
              {d.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white/60" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

function AdminMarriageDetailContent() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const { hasPermission } = useAuth();
  const permApprove = hasPermission(Permission.MARRIAGE_APPROVE);
  const permManage = hasPermission(Permission.MARRIAGE_MANAGE);
  const permCertificate = hasPermission(Permission.MARRIAGE_CERTIFICATE);
  const [app, setApp] = useState<MarriageApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const actionLoading = activeAction !== null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [weddingPhotoFile, setWeddingPhotoFile] = useState<File | null>(null);
  const [signedProvisionalFile, setSignedProvisionalFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);

  // MoMo payment
  const [momoPhone, setMomoPhone] = useState('');
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoTx, setMomoTx] = useState<{
    id: string;
    status: string;
    providerRef: string | null;
  } | null>(null);
  const [momoStatusMsg, setMomoStatusMsg] = useState<string | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);

  // Party confirmations
  interface PartyConfirmation {
    role: string;
    name: string | null;
    confirmedAt: string | null;
  }
  const [parties, setParties] = useState<PartyConfirmation[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  const fetchApp = useCallback(async () => {
    try {
      setLoading(true);
      const result = await marriageApi.admin.getOne(id);
      setApp(result);
    } catch {
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    if (!id) return;
    setLoadingParties(true);
    marriageApi.admin
      .getParties(id)
      .then((data) => setParties(data))
      .catch(() => {})
      .finally(() => setLoadingParties(false));
  }, [id]);

  const handleStatusUpdate = async (
    status: MarriageApplicationStatus,
    notes: string,
    action = status,
  ) => {
    setActiveAction(action);
    setActionError(null);
    try {
      const updated = await marriageApi.admin.updateStatus(id, { status, notes });
      setApp(updated);
      setSuccessMsg(`Status updated to ${STATUS_LABELS[status]}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setActionError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Action failed',
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirmPayment = async () => {
    setActiveAction('payment');
    setActionError(null);
    try {
      const updated = await marriageApi.admin.confirmPayment(id);
      setApp(updated);
      setSuccessMsg('Payment confirmed');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to confirm payment');
    } finally {
      setActiveAction(null);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    setActiveAction('schedule');
    setActionError(null);
    try {
      const updated = await marriageApi.admin.schedule(id, { ceremonyDate: scheduleDate });
      setApp(updated);
      setSuccessMsg('Ceremony scheduled — confirmation email sent');
      setScheduleDate('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to schedule ceremony');
    } finally {
      setActiveAction(null);
    }
  };

  const handleIssueCertificate = async () => {
    setActiveAction('certificate');
    setActionError(null);
    try {
      const updated = await marriageApi.admin.issueCertificate(id);
      setApp(updated);
      setSuccessMsg('Certificate issued — notification email sent');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to issue certificate');
    } finally {
      setActiveAction(null);
    }
  };

  const handleUploadWeddingPhoto = async () => {
    if (!weddingPhotoFile) return;
    setActiveAction('wedding-photo');
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
      const form = new FormData();
      form.append('file', weddingPhotoFile);
      const uploadRes = await axios.post(
        `${FILE_SERVER_URL}/api/v1/upload?folder=wedding-photos`,
        form,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      const fileKey: string = (uploadRes.data.data ?? uploadRes.data).key;
      const photoUrl = `${FILE_SERVER_URL}/api/v1/files/${fileKey}`;
      const updated = await marriageApi.admin.uploadWeddingPhoto(id, photoUrl);
      setApp(updated);
      setWeddingPhotoFile(null);
      setSuccessMsg('Wedding photo uploaded');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to upload wedding photo');
    } finally {
      setActiveAction(null);
    }
  };

  const handleUploadSignedProvisional = async () => {
    if (!signedProvisionalFile) return;
    setActiveAction('signed-provisional');
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
      const form = new FormData();
      form.append('file', signedProvisionalFile);
      const uploadRes = await axios.post(
        `${FILE_SERVER_URL}/api/v1/upload?folder=signed-provisional`,
        form,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      const uploaded = uploadRes.data.data ?? uploadRes.data;
      const fileKey: string = uploaded.key;
      const updated = await marriageApi.admin.uploadSignedProvisional(id, {
        fileKey,
        fileName: signedProvisionalFile.name,
        fileSize: signedProvisionalFile.size,
        // Browsers leave File.type empty for some files; prefer the type the
        // file-server detected, and never send an empty string.
        mimeType: uploaded.mimeType || signedProvisionalFile.type || 'application/octet-stream',
      });
      setApp(updated);
      setSignedProvisionalFile(null);
      setSuccessMsg('Signed provisional certificate uploaded');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to upload signed provisional certificate');
    } finally {
      setActiveAction(null);
    }
  };

  const handleVerifyDoc = async (docId: string, verified: boolean) => {
    setActiveAction(`verify-${docId}`);
    setActionError(null);
    try {
      const updated = await marriageApi.admin.verifyDocument(id, docId, verified);
      setApp(updated);
    } catch {
      setActionError('Failed to update document verification');
    } finally {
      setActiveAction(null);
    }
  };

  const handleInitiateMomo = async () => {
    const phone = momoPhone.trim().replace(/\s/g, '');
    if (!phone) {
      setMomoError('Enter the payer mobile number');
      return;
    }
    setMomoLoading(true);
    setMomoError(null);
    setMomoStatusMsg(null);
    setMomoTx(null);
    try {
      const result = await marriageApi.admin.initiateMomoPayment(id, phone);
      setMomoTx(result.transaction);
      setApp(result.application);
      setMomoStatusMsg(`Payment request sent — status: ${result.transaction.status}`);
    } catch (err: unknown) {
      setMomoError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to initiate payment',
      );
    } finally {
      setMomoLoading(false);
    }
  };

  const handleCheckMomoStatus = async () => {
    if (!momoTx) return;
    setMomoLoading(true);
    setMomoError(null);
    try {
      const result = await marriageApi.admin.checkMomoStatus(id, momoTx.id);
      setMomoTx((prev) => (prev ? { ...prev, status: result.status.toLowerCase() } : null));
      setMomoStatusMsg(`Status: ${result.status} — ${result.message}`);
      if (result.status === 'SUCCESSFUL') {
        await fetchApp(); // refresh app to show PAID
      }
    } catch {
      setMomoError('Status check failed');
    } finally {
      setMomoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading application...</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-medium">{error ?? 'Application not found'}</p>
        <Link
          href={`/${locale}/admin/marriage`}
          className="text-rose-600 text-sm mt-2 inline-block hover:underline"
        >
          Back to applications
        </Link>
      </div>
    );
  }

  const canApprove = ['submitted', 'under_review'].includes(app.status);
  const canReject = !['rejected', 'cancelled', 'closed'].includes(app.status);
  const canAmendments = ['submitted', 'under_review'].includes(app.status);
  const canSchedule = app.status === 'approved' && !app.ceremonyDate;
  const canMarkCompleted = app.status === 'approved' && !!app.ceremonyDate;
  const certStatusReady = ['approved', 'completed'].includes(app.status);
  const hasWeddingPhoto = !!app.weddingPhotoUrl;
  const hasSignedProvisional = (app.documents ?? []).some(
    (d) => d.documentType === 'signed_provisional',
  );
  // The official certificate may only be issued once the signed provisional
  // certificate has been uploaded.
  const canIssueCert = certStatusReady && hasSignedProvisional;
  const needsPaymentConfirm =
    app.paymentStatus !== 'paid' && ['pending_cash', 'processing'].includes(app.paymentStatus);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href={`/${locale}/admin/marriage`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to applications
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-rose-600" />
              <h1 className="text-xl font-bold text-gray-900 font-mono">{app.applicationNumber}</h1>
            </div>
            <p className="text-gray-500 text-sm">
              {app.groomName} & {app.brideName}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {actionError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Submission */}
          <Section title="Submission" icon={<UserCheck className="w-4 h-4" />}>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <InfoRow
                label="Submitted by"
                value={app.applicant?.name}
                icon={<User className="w-4 h-4" />}
              />
              <InfoRow
                label="Applicant email"
                value={app.applicant?.email}
                icon={<Mail className="w-4 h-4" />}
              />
              <InfoRow
                label="Applicant phone"
                value={app.applicant?.phone}
                icon={<Phone className="w-4 h-4" />}
              />
              <InfoRow
                label="Notification phone"
                value={app.notificationPhone}
                icon={<Phone className="w-4 h-4" />}
              />
              <InfoRow
                label="Submitted on"
                value={app.submittedAt ? new Date(app.submittedAt).toLocaleString() : null}
                icon={<Calendar className="w-4 h-4" />}
              />
              <InfoRow
                label="Created on"
                value={new Date(app.createdAt).toLocaleString()}
                icon={<Clock className="w-4 h-4" />}
              />
            </div>
          </Section>

          {/* Couple */}
          <Section title="Couple Details" icon={<Heart className="w-4 h-4" />}>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                  Groom
                </p>
                <InfoRow
                  label="Full name"
                  value={app.groomName}
                  icon={<User className="w-4 h-4" />}
                />
                <InfoRow
                  label="Father's name"
                  value={app.groomFatherName}
                  icon={<User className="w-4 h-4" />}
                />
                <InfoRow
                  label="National ID"
                  value={app.groomNid}
                  icon={<Fingerprint className="w-4 h-4" />}
                />
                <InfoRow
                  label="Date of birth"
                  value={app.groomBirthDate ? new Date(app.groomBirthDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <InfoRow
                  label="Phone"
                  value={app.groomPhone}
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">
                  Bride
                </p>
                <InfoRow
                  label="Full name"
                  value={app.brideName}
                  icon={<User className="w-4 h-4" />}
                />
                <InfoRow
                  label="Father's name"
                  value={app.brideFatherName}
                  icon={<User className="w-4 h-4" />}
                />
                <InfoRow
                  label="National ID"
                  value={app.brideNid}
                  icon={<Fingerprint className="w-4 h-4" />}
                />
                <InfoRow
                  label="Date of birth"
                  value={app.brideBirthDate ? new Date(app.brideBirthDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <InfoRow
                  label="Phone"
                  value={app.bridePhone}
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>
            </div>
          </Section>

          {/* Witnesses & Wali */}
          <Section title="Witnesses & Guardian" icon={<Users className="w-4 h-4" />}>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <div>
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                  Witness 1
                </p>
                <InfoRow
                  label="National ID"
                  value={app.witness1Nid}
                  icon={<Fingerprint className="w-4 h-4" />}
                />
                <InfoRow
                  label="Name"
                  value={app.witness1Name}
                  icon={<User className="w-4 h-4" />}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                  Witness 2
                </p>
                <InfoRow
                  label="National ID"
                  value={app.witness2Nid}
                  icon={<Fingerprint className="w-4 h-4" />}
                />
                <InfoRow
                  label="Name"
                  value={app.witness2Name}
                  icon={<User className="w-4 h-4" />}
                />
              </div>
            </div>
            {app.waliName && (
              <>
                <div className="border-t border-gray-100 mt-4 pt-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                    Wali (Guardian)
                  </p>
                  <div className="grid sm:grid-cols-3 gap-x-6">
                    <InfoRow
                      label="Name"
                      value={app.waliName}
                      icon={<Shield className="w-4 h-4" />}
                    />
                    <InfoRow
                      label="National ID"
                      value={app.waliNid}
                      icon={<Fingerprint className="w-4 h-4" />}
                    />
                    <InfoRow
                      label="Phone"
                      value={app.waliPhone}
                      icon={<Phone className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Ceremony & Mahr */}
          <Section title="Ceremony & Mahr" icon={<Calendar className="w-4 h-4" />}>
            <InfoRow
              label="Venue type"
              value={app.venueType === 'mosque' ? 'Mosque ceremony' : 'Outside mosque'}
              icon={
                app.venueType === 'mosque' ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )
              }
            />
            <InfoRow
              label="Location"
              value={[app.province, app.district].filter(Boolean).join(' — ')}
              icon={<MapPin className="w-4 h-4" />}
            />
            <InfoRow
              label="Venue address"
              value={app.venueAddress}
              icon={<MapPin className="w-4 h-4" />}
            />
            <InfoRow
              label="Preferred dates"
              value={[app.preferredDateFrom, app.preferredDateTo].filter(Boolean).join(' → ')}
              icon={<Calendar className="w-4 h-4" />}
            />
            <InfoRow
              label="Confirmed ceremony date"
              value={app.ceremonyDate ? new Date(app.ceremonyDate).toLocaleString() : null}
              icon={<Calendar className="w-4 h-4" />}
            />
            <InfoRow
              label="Requested officiant"
              value={app.requestedOfficiant}
              icon={<UserCheck className="w-4 h-4" />}
            />
            {app.mahrAmount != null && (
              <InfoRow
                label="Mahr"
                value={`${Number(app.mahrAmount).toLocaleString()} RWF${app.mahrDescription ? ' — ' + app.mahrDescription : ''}`}
                icon={<DollarSign className="w-4 h-4" />}
              />
            )}
          </Section>

          {/* Documents */}
          {(() => {
            const docs = app.documents ?? [];
            const docsWithUrl = docs.map((d) => ({ ...d, url: fileUrl(d.fileKey) }));
            const presentTypes = new Set(docs.map((d) => d.documentType));
            return (
              <Section title="Submitted Documents" icon={<FileText className="w-4 h-4" />}>
                {/* Required-document checklist — what was expected vs. what arrived */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {EXPECTED_DOCS.map((e) => {
                    const present = presentTypes.has(e.type);
                    return (
                      <span
                        key={e.type}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                          present
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : e.required
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : 'bg-gray-50 border-gray-200 text-gray-400',
                        )}
                      >
                        {present ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {DOC_TYPE_LABELS[e.type] ?? e.type}
                        {!e.required && <span className="opacity-60">· optional</span>}
                      </span>
                    );
                  })}
                </div>

                {docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-500">No documents submitted</p>
                    <p className="text-xs text-gray-400 mt-1">
                      The applicant has not uploaded any supporting documents.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {docsWithUrl.map((doc, i) => {
                        const isImage = doc.mimeType.startsWith('image/');
                        const verifying = activeAction === `verify-${doc.id}`;
                        return (
                          <div
                            key={doc.id}
                            className="group relative flex flex-col rounded-xl border border-gray-100 overflow-hidden hover:border-rose-300 hover:shadow-md transition-all"
                          >
                            {/* Thumbnail / icon area — click to preview */}
                            <button
                              type="button"
                              onClick={() => setLightbox({ index: i })}
                              className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden text-left"
                            >
                              {isImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={doc.url}
                                  alt={doc.fileName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                  <FileText className="w-8 h-8 text-gray-300" />
                                  <span className="text-[10px] font-medium text-gray-400 uppercase">
                                    {doc.mimeType.split('/')[1] ?? 'file'}
                                  </span>
                                </div>
                              )}
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-6 h-6 text-white" />
                              </div>
                              {/* Verified badge */}
                              {doc.verified && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </span>
                              )}
                            </button>

                            {/* Label + verify toggle */}
                            <div className="px-2.5 py-2">
                              <p className="text-[11px] font-semibold text-gray-700 leading-tight truncate">
                                {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                {doc.fileName}
                              </p>
                              <p className="text-[10px] text-gray-300 mt-0.5">
                                {(doc.fileSize / 1024).toFixed(0)} KB
                              </p>
                              {permManage && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyDoc(doc.id, !doc.verified)}
                                  disabled={verifying}
                                  className={cn(
                                    'mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors disabled:opacity-50',
                                    doc.verified
                                      ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                                      : 'border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700',
                                  )}
                                >
                                  {verifying ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : doc.verified ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> Verified
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-3 h-3" /> Mark verified
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* View-all strip */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {docs.length} file{docs.length !== 1 ? 's' : ''} — click any to preview or
                        download
                      </span>
                    </div>
                  </>
                )}
              </Section>
            );
          })()}

          {/* Status history */}
          {app.statusHistory && app.statusHistory.length > 0 && (
            <Section title="Status History" icon={<Clock className="w-4 h-4" />}>
              <ol className="relative space-y-4">
                {[...app.statusHistory].reverse().map((h, i) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → ` : ''}
                        {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                      </p>
                      {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(h.changedAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-5">
          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-rose-500" /> Payment
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount due</span>
                <span className="font-semibold">{Number(app.amountDue).toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount paid</span>
                <span className="font-semibold">{Number(app.amountPaid).toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    app.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : app.paymentStatus === 'pending_cash'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700',
                  )}
                >
                  {app.paymentStatus === 'paid'
                    ? 'Paid'
                    : app.paymentStatus === 'pending_cash'
                      ? 'Cash Pending'
                      : app.paymentStatus}
                </span>
              </div>
              {app.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="capitalize">{app.paymentMethod}</span>
                </div>
              )}
            </div>
            {needsPaymentConfirm && permManage && (
              <button
                onClick={handleConfirmPayment}
                disabled={actionLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {activeAction === 'payment' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Banknote className="w-4 h-4" />
                )}
                {activeAction === 'payment' ? 'Confirming...' : 'Confirm Payment'}
              </button>
            )}

            {/* MoMo Payment */}
            {app.paymentStatus !== 'paid' && permManage && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-violet-500" /> MoMo Payment (IntouchPay)
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="tel"
                      value={momoPhone}
                      onChange={(e) => {
                        setMomoPhone(e.target.value);
                        setMomoError(null);
                      }}
                      placeholder={
                        app.groomPhone ? app.groomPhone.replace(/[^0-9]/g, '') : '250788000000'
                      }
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Default: groom&apos;s phone. Another person can pay — enter their number above.
                  </p>
                  {momoError && <p className="text-[10px] text-red-600">{momoError}</p>}
                  {momoStatusMsg && (
                    <p
                      className={cn(
                        'text-[10px] font-medium',
                        momoTx?.status === 'completed'
                          ? 'text-green-700'
                          : momoTx?.status === 'failed'
                            ? 'text-red-600'
                            : 'text-amber-700',
                      )}
                    >
                      {momoStatusMsg}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleInitiateMomo}
                      disabled={momoLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {momoLoading && !momoTx ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5" />
                      )}
                      Send Request
                    </button>
                    {momoTx && momoTx.status === 'pending' && (
                      <button
                        onClick={handleCheckMomoStatus}
                        disabled={momoLoading}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 hover:border-violet-300 text-xs font-medium text-gray-600 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', momoLoading && 'animate-spin')} />
                        Check
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-rose-500" /> Actions
            </h3>
            <div className="space-y-2.5">
              {canApprove && permApprove && (
                <button
                  onClick={() => setModal('approve')}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {activeAction === 'approved' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {activeAction === 'approved' ? 'Approving...' : 'Approve Application'}
                </button>
              )}
              {canAmendments && permApprove && (
                <button
                  onClick={() => setModal('amendments')}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors"
                >
                  {activeAction === 'amendments_requested' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {activeAction === 'amendments_requested' ? 'Sending...' : 'Request Amendments'}
                </button>
              )}
              {canReject && permApprove && (
                <button
                  onClick={() => setModal('reject')}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {activeAction === 'rejected' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {activeAction === 'rejected' ? 'Rejecting...' : 'Reject Application'}
                </button>
              )}
              {['submitted', 'under_review'].includes(app.status) && permApprove && (
                <button
                  onClick={() =>
                    handleStatusUpdate(
                      'under_review' as MarriageApplicationStatus,
                      'Moved to under review',
                    )
                  }
                  disabled={actionLoading || app.status === 'under_review'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
                >
                  {activeAction === 'under_review' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {activeAction === 'under_review' ? 'Updating...' : 'Mark Under Review'}
                </button>
              )}
              {canMarkCompleted && permApprove && (
                <button
                  onClick={() =>
                    handleStatusUpdate(
                      'completed' as MarriageApplicationStatus,
                      'Nikah ceremony completed',
                    )
                  }
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {activeAction === 'completed' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {activeAction === 'completed' ? 'Updating...' : 'Mark Ceremony Completed'}
                </button>
              )}
              {certStatusReady && permCertificate && (
                <div>
                  <button
                    onClick={handleIssueCertificate}
                    disabled={actionLoading || !canIssueCert}
                    title={
                      !hasSignedProvisional
                        ? 'Attach the signed provisional certificate first to enable this'
                        : undefined
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {activeAction === 'certificate' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {activeAction === 'certificate' ? 'Issuing...' : 'Issue Certificate'}
                  </button>
                  {!hasSignedProvisional && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                      <FileSignature className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Upload the signed provisional certificate below to enable certificate issuance.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedule ceremony */}
          {canSchedule && permApprove && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500" /> Schedule Ceremony
              </h3>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 mb-3"
              />
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || actionLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {activeAction === 'schedule' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {activeAction === 'schedule' ? 'Scheduling...' : 'Set Ceremony Date'}
              </button>
            </div>
          )}

          {/* Signed provisional certificate — required before issuing the official one */}
          {certStatusReady && permCertificate && (() => {
            const signedDoc = (app.documents ?? []).find(
              (d) => d.documentType === 'signed_provisional',
            );
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-rose-500" /> Signed Provisional Certificate
                </h3>
                {signedDoc ? (
                  <div className="space-y-2">
                    {signedDoc.mimeType?.startsWith('image/') && (
                      <a href={fileUrl(signedDoc.fileKey)} target="_blank" rel="noreferrer">
                        <img
                          src={fileUrl(signedDoc.fileKey)}
                          alt="Signed provisional certificate"
                          className="w-full rounded-xl object-cover max-h-48 border border-gray-100"
                        />
                      </a>
                    )}
                    <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
                      <FileSignature className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-xs text-gray-700 flex-1 truncate">{signedDoc.fileName}</span>
                      <a
                        href={fileUrl(signedDoc.fileKey)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-green-700 hover:text-green-800"
                      >
                        View
                      </a>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Signed provisional uploaded ✓</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Upload the provisional certificate signed by the witnesses, officiant and couple.
                    </p>
                    <label
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                        signedProvisionalFile
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-gray-200 hover:border-rose-300',
                      )}
                    >
                      <FileSignature className="w-6 h-6 text-gray-300" />
                      <span className="text-xs text-gray-500">
                        {signedProvisionalFile
                          ? signedProvisionalFile.name
                          : 'Click to select signed certificate (image or PDF)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setSignedProvisionalFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      onClick={handleUploadSignedProvisional}
                      disabled={!signedProvisionalFile || actionLoading}
                      className="w-full px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {activeAction === 'signed-provisional' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSignature className="w-4 h-4" />
                      )}
                      {activeAction === 'signed-provisional' ? 'Uploading...' : 'Upload Signed Certificate'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Wedding photo upload — available during validation and after ceremony */}
          {['submitted', 'under_review', 'amendments_requested', 'approved', 'completed'].includes(
            app.status,
          ) &&
            permManage && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-rose-500" /> Marriage Photo
                </h3>
                {app.weddingPhotoUrl ? (
                  <div className="space-y-2">
                    <img
                      src={app.weddingPhotoUrl}
                      alt="Wedding"
                      className="w-full rounded-xl object-cover aspect-video border border-gray-100"
                    />
                    <p className="text-xs text-gray-400 text-center">Photo uploaded ✓</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                        weddingPhotoFile
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-gray-200 hover:border-rose-300',
                      )}
                    >
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                      <span className="text-xs text-gray-500">
                        {weddingPhotoFile
                          ? weddingPhotoFile.name
                          : 'Click to select marriage photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setWeddingPhotoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      onClick={handleUploadWeddingPhoto}
                      disabled={!weddingPhotoFile || actionLoading}
                      className="w-full px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {activeAction === 'wedding-photo' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      {activeAction === 'wedding-photo' ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Party Confirmations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <CheckCheck className="w-4 h-4 text-rose-500" /> Party Confirmations
            </h3>
            {loadingParties ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : parties.length === 0 ? (
              <p className="text-xs text-gray-400">No party confirmations recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {parties.map((p) => {
                  const confirmed = !!p.confirmedAt;
                  const ROLE_LABELS: Record<string, string> = {
                    groom: 'Groom',
                    bride: 'Bride',
                    wali: 'Wali',
                    imam: 'Imam',
                  };
                  return (
                    <div
                      key={p.role}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm',
                        confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
                      )}
                    >
                      {confirmed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-xs font-semibold',
                            confirmed ? 'text-green-800' : 'text-amber-800',
                          )}
                        >
                          {ROLE_LABELS[p.role] ?? p.role}
                          {p.name && <span className="font-normal"> — {p.name}</span>}
                        </p>
                        {confirmed && (
                          <p className="text-[10px] text-green-600 mt-0.5">
                            {new Date(p.confirmedAt!).toLocaleString()}
                          </p>
                        )}
                        {!confirmed && <p className="text-[10px] text-amber-600 mt-0.5">Pending</p>}
                      </div>
                    </div>
                  );
                })}
                {parties.every((p) => p.confirmedAt) && (
                  <p className="text-[11px] text-green-700 font-semibold text-center pt-1">
                    ✓ All parties confirmed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Certificate */}
          {app.status === 'closed' && app.certificateUrl && (
            <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
              <h3 className="font-semibold text-purple-900 mb-2 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Certificate
              </h3>
              <a
                href={app.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Eye className="w-4 h-4" /> View Certificate
              </a>
            </div>
          )}

          {/* Review notes */}
          {app.reviewNotes && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Review notes</p>
              <p className="text-blue-700/80 text-xs">{app.reviewNotes}</p>
            </div>
          )}
          {app.rejectionReason && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">Rejection reason</p>
              <p className="text-red-700/80 text-xs">{app.rejectionReason}</p>
            </div>
          )}
          {app.amendmentsRequestedText && (
            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 text-sm text-orange-800">
              <p className="font-semibold mb-1">Amendments requested</p>
              <p className="text-orange-700/80 text-xs">{app.amendmentsRequestedText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Document lightbox */}
      {lightbox && app.documents && app.documents.length > 0 && (
        <Lightbox
          docs={app.documents.map((d) => ({
            id: d.id,
            url: fileUrl(d.fileKey),
            name: DOC_TYPE_LABELS[d.documentType] ?? d.fileName,
            mimeType: d.mimeType,
            verified: d.verified,
          }))}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onVerify={handleVerifyDoc}
          verifyingId={
            activeAction?.startsWith('verify-') ? activeAction.slice('verify-'.length) : null
          }
        />
      )}

      {/* Action modals */}
      {modal === 'approve' && (
        <ActionModal
          title="Approve Application"
          placeholder="Notes for the applicant (optional)"
          confirmLabel="Approve"
          confirmClass="bg-green-600 hover:bg-green-700"
          onClose={() => setModal(null)}
          onConfirm={async (notes) => {
            await handleStatusUpdate('approved' as MarriageApplicationStatus, notes);
            setModal(null);
          }}
        />
      )}
      {modal === 'amendments' && (
        <ActionModal
          title="Request Amendments"
          placeholder="Describe what the applicant needs to correct or provide..."
          confirmLabel="Request Amendments"
          confirmClass="bg-orange-500 hover:bg-orange-600"
          required
          onClose={() => setModal(null)}
          onConfirm={async (notes) => {
            await marriageApi.admin.updateStatus(id, {
              status: 'amendments_requested' as MarriageApplicationStatus,
              amendmentsRequestedText: notes,
            });
            const updated = await marriageApi.admin.getOne(id);
            setApp(updated);
            setModal(null);
          }}
        />
      )}
      {modal === 'reject' && (
        <ActionModal
          title="Reject Application"
          placeholder="Reason for rejection (required)..."
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
          required
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await marriageApi.admin.updateStatus(id, {
              status: 'rejected' as MarriageApplicationStatus,
              rejectionReason: reason,
            });
            const updated = await marriageApi.admin.getOne(id);
            setApp(updated);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminMarriageDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.MARRIAGE_VIEW]}>
      <AdminMarriageDetailContent />
    </ProtectedRoute>
  );
}
