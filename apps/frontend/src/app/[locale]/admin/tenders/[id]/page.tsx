'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  FileText,
  CheckCircle2,
  Loader2,
  Trophy,
  XCircle,
  AlertTriangle,
  Eye,
  History,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { fileUrl } from '@/lib/api';
import { resolveI18n } from '@/lib/tendersApi';
import { STATUS_COLORS, type TenderDocumentType } from '@/lib/tenderApplicationApi';
import {
  tenderApplicationAdminApi,
  type AdminTenderApplication,
  type TenderStatusAction,
} from '@/lib/tenderApplicationAdminApi';

const DOC_LABELS: Record<TenderDocumentType, string> = {
  rdb_certificate: 'Company Registration (RDB)',
  tax_clearance: 'RRA Tax Clearance',
  proposal: 'Technical & Financial Proposal',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  more_info_requested: 'More info requested',
  shortlisted: 'Shortlisted',
  awarded: 'Awarded',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export default function AdminTenderDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_VIEW]}>
      <AdminTenderDetailContent />
    </ProtectedRoute>
  );
}

function AdminTenderDetailContent() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const { hasPermission } = useAuth();
  const canEvaluate = hasPermission(Permission.TENDER_EVALUATE);
  const canManage = hasPermission(Permission.TENDER_MANAGE);

  const [application, setApplication] = useState<AdminTenderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<TenderStatusAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApplication(await tenderApplicationAdminApi.getById(id));
    } catch {
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: TenderStatusAction) => {
    setActing(action);
    setError(null);
    try {
      // `notes` doubles as the rejection reason — the backend requires one for
      // REJECT and the other for REQUEST_MORE_INFO, and rejects a blank either way.
      const body =
        action === 'reject'
          ? { reason: notes }
          : action === 'request_more_info'
            ? { notes }
            : {};
      const updated = await tenderApplicationAdminApi.updateStatus(id, action, body);
      setApplication((prev) => (prev ? { ...prev, ...updated } : updated));
      setNotes('');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Something went wrong.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setActing(null);
    }
  };

  const toggleDocVerified = async (documentId: string, verified: boolean) => {
    await tenderApplicationAdminApi.verifyDocument(id, documentId, verified);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-gray-400">Application not found.</p>
        <Link
          href={`/${locale}/admin/tenders`}
          className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline"
        >
          ← Back to applications
        </Link>
      </div>
    );
  }

  const isClosed = ['rejected', 'withdrawn'].includes(application.status);
  const allDocsVerified =
    application.documents.length > 0 && application.documents.every((d) => d.verified);

  return (
    <div className="space-y-5 max-w-4xl">
      <Link
        href={`/${locale}/admin/tenders`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{application.companyName}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {application.applicationNumber}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {application.tender
                ? resolveI18n(application.tender.titleI18n, application.tender.title, locale)
                : '—'}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-full',
            STATUS_COLORS[application.status],
          )}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      {/* Applicant + bid details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4 text-sm">Bid details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Field label="Contact person" value={application.contactName} />
          <Field label="TIN" value={application.companyTin} />
          <Field label="Phone" value={application.phone} />
          <Field label="Email" value={application.email ?? '—'} />
          <Field
            label="Bid amount"
            value={
              application.bidAmount != null
                ? `${Number(application.bidAmount).toLocaleString()} RWF`
                : '—'
            }
          />
          <Field
            label="Submitted"
            value={new Date(application.submittedAt).toLocaleString()}
          />
          <Field
            label="Account"
            value={application.applicant?.name || application.applicant?.email || '—'}
          />
          <Field
            label="Address"
            value={[application.cell, application.village].filter(Boolean).join(', ') || '—'}
          />
        </dl>

        {application.coverNote && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Cover note
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {application.coverNote}
            </p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-sm">Documents</h2>
          {allDocsVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> All verified
            </span>
          )}
        </div>

        <ul className="space-y-2">
          {application.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  doc.verified ? 'bg-green-50' : 'bg-gray-50',
                )}
              >
                <FileText
                  className={cn('w-4 h-4', doc.verified ? 'text-green-600' : 'text-gray-400')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{DOC_LABELS[doc.docType]}</p>
                <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
              </div>

              <a
                href={fileUrl(doc.fileKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-teal-400 hover:text-teal-600 transition-colors shrink-0"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </a>

              {canManage && (
                <Button
                  size="xs"
                  variant={doc.verified ? 'ghost' : 'outline'}
                  onClick={() => toggleDocVerified(doc.id, !doc.verified)}
                >
                  {doc.verified ? 'Un-verify' : 'Verify'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Evaluation actions */}
      {canEvaluate && !isClosed && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm">Evaluation</h2>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5"
            >
              {error}
            </div>
          )}

          <Textarea
            label="Notes / reason"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            hint="Required when requesting more information or rejecting a bid — it is sent to the bidder."
          />

          <div className="flex flex-wrap gap-2">
            {application.status === 'submitted' && (
              <Button
                size="sm"
                variant="outline"
                isLoading={acting === 'start_review'}
                onClick={() => act('start_review')}
              >
                Start review
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              leftIcon={<AlertTriangle className="w-4 h-4" />}
              isLoading={acting === 'request_more_info'}
              disabled={!notes.trim()}
              onClick={() => act('request_more_info')}
            >
              Request more info
            </Button>

            {application.status !== 'shortlisted' && application.status !== 'awarded' && (
              <Button
                size="sm"
                isLoading={acting === 'shortlist'}
                onClick={() => act('shortlist')}
              >
                Shortlist
              </Button>
            )}

            {/* The backend only allows an award from `shortlisted` — mirror that here
                rather than offering a button that is guaranteed to 400. */}
            {application.status === 'shortlisted' && (
              <Button
                size="sm"
                leftIcon={<Trophy className="w-4 h-4" />}
                isLoading={acting === 'award'}
                onClick={() => act('award')}
              >
                Award tender
              </Button>
            )}

            <Button
              size="sm"
              variant="danger"
              leftIcon={<XCircle className="w-4 h-4" />}
              isLoading={acting === 'reject'}
              disabled={!notes.trim()}
              onClick={() => act('reject')}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* History */}
      {application.statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" /> History
          </h2>
          <ol className="space-y-3">
            {application.statusHistory.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-900">
                    {entry.fromStatus
                      ? `${STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus} → ${STATUS_LABELS[entry.toStatus] ?? entry.toStatus}`
                      : (STATUS_LABELS[entry.toStatus] ?? entry.toStatus)}
                  </p>
                  {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(entry.changedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-900 mt-0.5 break-words">{value}</dd>
    </div>
  );
}
