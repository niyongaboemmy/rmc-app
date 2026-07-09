'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ShieldCheck, User, Phone, Mail, MapPin, Building2,
  FileText, DollarSign, UserCheck, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, Send, Banknote, X, Award, Search,
} from 'lucide-react';
import { goodConductApi, type GoodConductRequest, type GoodConductStatus, STATUS_COLORS } from '@/lib/goodConductApi';
import { goodConductAdminApi } from '@/lib/goodConductAdminApi';
import { mosqueApi, type Mosque, type MosqueImam } from '@/lib/mosqueApi';
import { publicApi } from '@/lib/public-api';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

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
  visa: 'Visa Application',
  school: 'School Admission',
  other: 'Other',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
        STATUS_COLORS[status as GoodConductStatus] ?? 'bg-gray-100 text-gray-700',
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
        <span className="text-indigo-500">{icon}</span>
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
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50', confirmClass ?? 'bg-indigo-600 hover:bg-indigo-700')}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AdminGoodConductDetailContent() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const { hasPermission } = useAuth();
  const permApprove = hasPermission(Permission.GOOD_CONDUCT_APPROVE);
  const permManage = hasPermission(Permission.GOOD_CONDUCT_MANAGE);
  const permCertificate = hasPermission(Permission.GOOD_CONDUCT_CERTIFICATE);

  const [request, setRequest] = useState<GoodConductRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const actionLoading = activeAction !== null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [imams, setImams] = useState<MosqueImam[]>([]);
  const [selectedImamId, setSelectedImamId] = useState('');
  const [imamNote, setImamNote] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const result = await goodConductAdminApi.getOne(id);
      setRequest(result);
      setPaymentAmount(String(result.amountDue));
    } catch {
      setActionError('Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  useEffect(() => {
    if (!request?.mosqueId) { setMosque(null); setImams([]); return; }
    mosqueApi.get(request.mosqueId).then(setMosque).catch(() => setMosque(null));
    mosqueApi.getImams(request.mosqueId).then(setImams).catch(() => setImams([]));
  }, [request?.mosqueId]);

  useEffect(() => {
    if (!request?.districtId) { setDistrictName(null); return; }
    publicApi.getDistricts().then((ds) => {
      setDistrictName(ds.find((d) => d.id === request.districtId)?.name ?? null);
    }).catch(() => setDistrictName(null));
  }, [request?.districtId]);

  const handleStatusUpdate = async (
    action: 'start_review' | 'approve' | 'reject' | 'request_more_info',
    payload: { notes?: string; reason?: string } = {},
  ) => {
    setActiveAction(action);
    setActionError(null);
    try {
      const updated = await goodConductAdminApi.updateStatus(id, { action, ...payload });
      setRequest(updated);
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

  const handleAssignImam = async () => {
    setActiveAction('assign-imam');
    setActionError(null);
    try {
      const updated = await goodConductAdminApi.assignImam(id, {
        mosqueImamId: selectedImamId || undefined,
        note: imamNote.trim() || undefined,
      });
      setRequest(updated);
      setImamNote('');
      setSuccessMsg('Imam assignment updated');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to update imam assignment');
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirmPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a valid amount');
      return;
    }
    setActiveAction('payment');
    setActionError(null);
    try {
      const updated = await goodConductAdminApi.confirmPayment(id, { method: paymentMethod, amount });
      setRequest(updated);
      setSuccessMsg('Payment confirmed');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to confirm payment');
    } finally {
      setActiveAction(null);
    }
  };

  const handleIssueCertificate = async () => {
    setActiveAction('certificate');
    setActionError(null);
    try {
      const updated = await goodConductAdminApi.issueCertificate(id);
      setRequest(updated);
      setSuccessMsg('Certificate issued');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setActionError('Failed to issue certificate');
    } finally {
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Request not found.</p>
      </div>
    );
  }

  const needsReview = request.status === 'submitted';
  const needsDecision = request.status === 'under_review';
  const canIssueCertificate = request.status === 'approved';
  const residence = [districtName, request.cell, request.village].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/${locale}/admin/good-conduct`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to requests
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{request.fullNames}</h1>
            <p className="text-xs text-gray-400 font-mono">{request.id}</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3">{successMsg}</div>
      )}
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{actionError}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Section title="Identity" icon={<User className="w-4 h-4" />}>
            <InfoRow label="Full Names" value={request.fullNames} icon={<User className="w-3.5 h-3.5" />} />
            <InfoRow label="Father's Name" value={request.fatherName} />
            <InfoRow label="Mother's Name" value={request.motherName} />
            <InfoRow label="Phone" value={request.phone} icon={<Phone className="w-3.5 h-3.5" />} />
            <InfoRow label="Email" value={request.email} icon={<Mail className="w-3.5 h-3.5" />} />
          </Section>

          <Section title="Residence" icon={<MapPin className="w-4 h-4" />}>
            <InfoRow label="District" value={districtName} icon={<MapPin className="w-3.5 h-3.5" />} />
            <InfoRow label="Cell" value={request.cell} />
            <InfoRow label="Village" value={request.village} />
            {!residence && <p className="text-sm text-gray-400">No residence details provided.</p>}
          </Section>

          <Section title="Masjid & Imam" icon={<Building2 className="w-4 h-4" />}>
            <InfoRow label="Mosque" value={mosque?.name} icon={<Building2 className="w-3.5 h-3.5" />} />
            <InfoRow label="Requested Imam (free text)" value={request.requestedImamName} icon={<UserCheck className="w-3.5 h-3.5" />} />
            <InfoRow label="Assigned Imam ID" value={request.assignedImamId} />
          </Section>

          <Section title="Request Reason" icon={<FileText className="w-4 h-4" />}>
            <InfoRow label="Motif" value={MOTIF_LABELS[request.motif] ?? request.motif} />
            <InfoRow label="Details" value={request.motifDetail} />
          </Section>

          {/* Status action panel */}
          {permApprove && (needsReview || needsDecision) && (
            <Section title="Review Decision" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="flex flex-wrap gap-3">
                {needsReview && (
                  <button
                    onClick={() => handleStatusUpdate('start_review')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {activeAction === 'start_review' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Start Review
                  </button>
                )}
                {needsDecision && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('approve')}
                      disabled={actionLoading || request.paymentStatus !== 'paid'}
                      title={request.paymentStatus !== 'paid' ? 'Payment must be confirmed before approval' : undefined}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {activeAction === 'approve' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => setModal('reject')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => setModal('more_info')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-4 h-4" /> Request More Info
                    </button>
                  </>
                )}
              </div>
              {needsDecision && request.paymentStatus !== 'paid' && (
                <p className="text-xs text-amber-600 mt-3">Payment must be confirmed before this request can be approved.</p>
              )}
            </Section>
          )}

          {/* Assign Imam */}
          {permManage && (
            <Section title="Assign Imam" icon={<UserCheck className="w-4 h-4" />}>
              {!request.mosqueId ? (
                <p className="text-sm text-gray-400">No mosque was selected on this request.</p>
              ) : (
                <div className="space-y-3">
                  {imams.length > 0 ? (
                    <select
                      value={selectedImamId}
                      onChange={(e) => setSelectedImamId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="">— Select a registered imam —</option>
                      {imams.map((imam) => (
                        <option key={imam.id} value={imam.id}>
                          Imam {imam.id.slice(0, 8)} {imam.isPrimary ? '(Primary)' : ''} — since {imam.startDate ? new Date(imam.startDate).toLocaleDateString() : '—'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No registered MosqueImam records for this mosque — use the note field to record manual confirmation.
                    </p>
                  )}
                  <textarea
                    rows={2}
                    value={imamNote}
                    onChange={(e) => setImamNote(e.target.value)}
                    placeholder="Note (e.g. confirmed with the mosque by phone)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                  />
                  <button
                    onClick={handleAssignImam}
                    disabled={actionLoading || (!selectedImamId && !imamNote.trim())}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {activeAction === 'assign-imam' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* Status history */}
          {request.statusHistory && request.statusHistory.length > 0 && (
            <Section title="Status History" icon={<Clock className="w-4 h-4" />}>
              <ol className="relative space-y-4">
                {[...request.statusHistory].reverse().map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
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

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-indigo-500" /> Payment
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount due</span>
                <span className="font-semibold">{Number(request.amountDue).toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount paid</span>
                <span className="font-semibold">{Number(request.amountPaid).toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  request.paymentStatus === 'paid' ? 'bg-green-100 text-green-700'
                    : request.paymentStatus === 'pending_cash' || request.paymentStatus === 'processing' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700',
                )}>
                  {request.paymentStatus}
                </span>
              </div>
            </div>
            {permManage && request.paymentStatus !== 'paid' && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                    className="px-2.5 py-2 rounded-lg border border-gray-200 text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 px-2.5 py-2 rounded-lg border border-gray-200 text-xs"
                  />
                </div>
                <button
                  onClick={handleConfirmPayment}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {activeAction === 'payment' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  {activeAction === 'payment' ? 'Confirming...' : 'Confirm Cash/Bank Payment'}
                </button>
              </div>
            )}
          </div>

          {/* Certificate */}
          {permCertificate && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-indigo-500" /> Certificate
              </h3>
              {request.certificateNumber ? (
                <div className="space-y-1 text-sm">
                  <p className="font-mono text-indigo-700">{request.certificateNumber}</p>
                  <p className="text-xs text-gray-400">
                    Issued {request.certificateIssuedAt ? new Date(request.certificateIssuedAt).toLocaleDateString() : ''}
                  </p>
                </div>
              ) : canIssueCertificate ? (
                <button
                  onClick={handleIssueCertificate}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {activeAction === 'certificate' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  {activeAction === 'certificate' ? 'Issuing...' : 'Issue Certificate'}
                </button>
              ) : (
                <p className="text-xs text-gray-400">Available once the request is approved.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modal === 'reject' && (
        <ActionModal
          title="Reject Request"
          onClose={() => setModal(null)}
          onConfirm={(reason) => handleStatusUpdate('reject', { reason })}
          placeholder="Reason for rejection (required)"
          required
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}
      {modal === 'more_info' && (
        <ActionModal
          title="Request More Information"
          onClose={() => setModal(null)}
          onConfirm={(notes) => handleStatusUpdate('request_more_info', { notes })}
          placeholder="What information is needed? (required)"
          required
          confirmLabel="Send Request"
          confirmClass="bg-amber-500 hover:bg-amber-600"
        />
      )}
    </div>
  );
}

export default function AdminGoodConductDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.GOOD_CONDUCT_VIEW]}>
      <AdminGoodConductDetailContent />
    </ProtectedRoute>
  );
}
