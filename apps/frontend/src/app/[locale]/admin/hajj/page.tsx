'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass, Search, RefreshCw, Loader2, CheckCircle2, XCircle, Clock,
  FileText, Phone, Mail, MapPin, BookUser, X, History, Eye, Download,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  hajjApi,
  HAJJ_FINAL_STATUSES,
  HAJJ_STATUS_COLORS,
  HAJJ_STATUS_LABELS,
  HAJJ_DOCUMENT_LABELS,
  type HajjApplication,
  type HajjDocument,
  type HajjStatus,
  type HajjStatusHistoryEntry,
} from '@/lib/hajjApi';

export default function AdminHajjPage() {
  return (
    <ProtectedRoute permissions={[Permission.HAJJ_VIEW]}>
      <HajjAdmin />
    </ProtectedRoute>
  );
}

/**
 * Renders into <body>.
 *
 * The admin shell's <main> carries a transform, which makes it the containing block
 * for `position: fixed` children — so a full-screen overlay rendered in place is
 * clipped to the content area instead of the viewport. Portalling escapes that.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

const STATUS_OPTIONS: { value: HajjStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: HAJJ_STATUS_LABELS.submitted },
  { value: 'under_review', label: HAJJ_STATUS_LABELS.under_review },
  { value: 'approved', label: HAJJ_STATUS_LABELS.approved },
  { value: 'rejected', label: HAJJ_STATUS_LABELS.rejected },
];

function HajjAdmin() {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission(Permission.HAJJ_APPROVE);

  const [items, setItems] = useState<HajjApplication[]>([]);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<HajjStatus, number> } | null>(null);
  const [status, setStatus] = useState<HajjStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<HajjApplication | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, s] = await Promise.all([
        hajjApi.admin.list({ status, search, limit: 50 }),
        hajjApi.admin.stats(),
      ]);
      setItems(list.items);
      setStats(s);
    } catch {
      setError('Could not load Hajj applications.');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Exports every application matching the current filters — not just the 50 rows
   * the table is showing — so a filtered report is complete rather than truncated.
   */
  const exportReport = async () => {
    setExporting(true);
    setError('');
    try {
      await hajjApi.admin.exportXlsx({ status, search });
    } catch {
      setError('Could not export the report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  /** Applied after an approve/reject so the row and the counters stay truthful. */
  const onDecided = (updated: HajjApplication, message: string) => {
    setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
    setToast(message);
    setTimeout(() => setToast(''), 4000);
    void load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/10">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hajj Applications</h1>
            <p className="text-sm text-gray-500">Verify each application, then approve or decline it. The applicant is notified at every step.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void exportReport()}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export Excel
          </button>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats?.total ?? 0} icon={FileText} tone="gray" />
        <StatCard label="Submitted" value={stats?.byStatus.submitted ?? 0} icon={FileText} tone="gray" />
        <StatCard label="Under review" value={stats?.byStatus.under_review ?? 0} icon={Clock} tone="amber" />
        <StatCard label="Approved" value={stats?.byStatus.approved ?? 0} icon={CheckCircle2} tone="green" />
        <StatCard label="Not approved" value={stats?.byStatus.rejected ?? 0} icon={XCircle} tone="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, name, phone or passport…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          />
        </div>
        <SearchableSelect
          value={status}
          onChange={(v) => setStatus(v as HajjStatus | '')}
          options={STATUS_OPTIONS}
          className="w-full sm:w-56"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Compass className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-900">No applications</p>
            <p className="mt-1 text-sm text-gray-500">Applications submitted from the Hajj page will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Application</th>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-4 py-3 font-semibold">Residence</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-rmc-green">
                      {a.applicationNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{a.fullName}</p>
                      <p className="text-xs text-gray-500">{a.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.district}
                      <span className="text-gray-400"> · {a.sector}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(a)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ReviewDrawer
          app={selected}
          canApprove={canApprove}
          onClose={() => setSelected(null)}
          onDecided={onDecided}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Review drawer ───────────────────────────────────────────────────────────

function ReviewDrawer({
  app,
  canApprove,
  onClose,
  onDecided,
}: {
  app: HajjApplication;
  canApprove: boolean;
  onClose: () => void;
  onDecided: (updated: HajjApplication, message: string) => void;
}) {
  const [history, setHistory] = useState<HajjStatusHistoryEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<HajjStatus | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [viewing, setViewing] = useState<HajjDocument | null>(null);
  const [docs, setDocs] = useState<HajjDocument[]>(app.documents ?? []);

  const decided = HAJJ_FINAL_STATUSES.includes(app.status);

  useEffect(() => {
    void hajjApi.admin.history(app.id).then(setHistory).catch(() => setHistory([]));
  }, [app.id]);

  // The list endpoint doesn't join documents — fetch the full record for the drawer.
  useEffect(() => {
    void hajjApi.admin
      .getOne(app.id)
      .then((full) => setDocs(full.documents ?? []))
      .catch(() => setDocs([]));
  }, [app.id]);

  const onDocVerified = (updated: HajjDocument) => {
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setViewing((v) => (v && v.id === updated.id ? updated : v));
  };

  const move = async (status: HajjStatus) => {
    setBusy(status);
    setError('');
    try {
      const updated = await hajjApi.admin.updateStatus(app.id, {
        status,
        notes: notes.trim() || undefined,
        ...(status === 'rejected' ? { rejectionReason: reason.trim() } : {}),
      });
      onDecided(
        updated,
        status === 'approved'
          ? `${app.applicationNumber} approved — applicant notified`
          : status === 'rejected'
            ? `${app.applicationNumber} declined — applicant notified with the reason`
            : `${app.applicationNumber} marked under review — applicant notified`,
      );
      setRejecting(false);
      setNotes('');
      setReason('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Action failed',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-[1px]" onClick={onClose}>
        <aside
          className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="font-mono text-sm font-bold text-rmc-green">{app.applicationNumber}</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{app.fullName}</p>
            <div className="mt-1.5">
              <StatusBadge status={app.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Details to verify */}
          <section className="space-y-2.5">
            <Row icon={Phone} label="Phone" value={app.phone} />
            <Row icon={Mail} label="Email" value={app.email ?? '— none given (SMS only)'} />
            <Row icon={MapPin} label="Residence" value={`${app.district} · ${app.sector}`} />
            <Row icon={BookUser} label="Passport" value={app.passportNumber} mono />
          </section>

          {/* The receipts themselves — click to open the actual file. */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment receipts
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  canVerify={canApprove}
                  onOpen={() => setViewing(doc)}
                  onVerified={onDocVerified}
                />
              ))}
              {docs.length === 0 && (
                <p className="col-span-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  No receipts were uploaded with this application.
                </p>
              )}
            </div>
          </section>

          {/* Decision */}
          {decided ? (
            <div
              className={cn(
                'rounded-xl px-4 py-3 text-sm ring-1',
                app.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                  : 'bg-red-50 text-red-800 ring-red-100',
              )}
            >
              <p className="font-semibold">
                {app.status === 'approved' ? 'Approved' : 'Not approved'} — this decision is final.
              </p>
              {app.rejectionReason && <p className="mt-1 leading-relaxed">Reason sent: {app.rejectionReason}</p>}
            </div>
          ) : !canApprove ? (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 ring-1 ring-gray-100">
              You can view applications but not decide them. This needs the <code>hajj:approve</code> permission.
            </p>
          ) : (
            <section className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Internal note <span className="font-normal text-gray-400">(optional — not sent to the applicant)</span>
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                  placeholder="e.g. Passport verified against the payment receipt"
                />
              </label>

              {rejecting && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-red-600">
                    Reason for declining <span className="font-normal">(required — sent to the applicant)</span>
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    autoFocus
                    className="w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
                    placeholder="e.g. The advance payment proof is not legible"
                  />
                </label>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

              <div className="flex flex-wrap gap-2">
                {app.status === 'submitted' && (
                  <ActionButton
                    onClick={() => void move('under_review')}
                    busy={busy === 'under_review'}
                    icon={Clock}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    Start review
                  </ActionButton>
                )}
                <ActionButton
                  onClick={() => void move('approved')}
                  busy={busy === 'approved'}
                  icon={CheckCircle2}
                  className="bg-rmc-green hover:bg-rmc-green-dark"
                >
                  Approve
                </ActionButton>
                {rejecting ? (
                  <>
                    <ActionButton
                      onClick={() => void move('rejected')}
                      busy={busy === 'rejected'}
                      disabled={!reason.trim()}
                      icon={XCircle}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirm decline
                    </ActionButton>
                    <button
                      onClick={() => { setRejecting(false); setReason(''); }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setRejecting(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" /> Decline
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Every decision texts the applicant immediately{app.email ? ' and emails them' : ''}. Approvals and declines are final.
              </p>
            </section>
          )}

          {/* Audit trail */}
          <section>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> History
            </h3>
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  <div>
                    <p className="text-gray-900">
                      {h.fromStatus ? `${label(h.fromStatus)} → ` : ''}
                      <span className="font-semibold">{label(h.toStatus)}</span>
                    </p>
                    {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                    <p className="text-[11px] text-gray-400">{new Date(h.changedAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
              {history.length === 0 && <li className="text-sm text-gray-400">No history yet.</li>}
            </ol>
          </section>
          </div>
        </aside>

        {viewing && <Lightbox doc={viewing} onClose={() => setViewing(null)} />}
      </div>
    </Portal>
  );
}

// ── Documents ───────────────────────────────────────────────────────────────

function prettySize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Receipts are private: the file server won't serve them to the browser, so we pull
 * the bytes through the authenticated admin route and render them from a blob URL.
 */
function useReceiptUrl(docId: string): { url: string; failed: boolean } {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl = '';
    if (!docId) return; // caller doesn't need the bytes (e.g. a PDF thumbnail)

    hajjApi.admin
      .documentObjectUrl(docId)
      .then((u) => {
        if (revoked) {
          URL.revokeObjectURL(u); // unmounted while loading
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => setFailed(true));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  return { url, failed };
}

/** A receipt thumbnail: images preview inline, PDFs show an icon. Click to open. */
function DocumentCard({
  doc,
  canVerify,
  onOpen,
  onVerified,
}: {
  doc: HajjDocument;
  canVerify: boolean;
  onOpen: () => void;
  onVerified: (updated: HajjDocument) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isImage = doc.mimeType.startsWith('image/');
  // Only images need the bytes up-front, for the thumbnail.
  const { url: thumbUrl } = useReceiptUrl(isImage ? doc.id : '');

  const toggle = async () => {
    setBusy(true);
    try {
      onVerified(await hajjApi.admin.verifyDocument(doc.id, !doc.verified));
    } catch {
      /* leave the tick as it was */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full"
        aria-label={`Open ${doc.fileName}`}
      >
        <span className="flex h-28 items-center justify-center bg-gray-50">
          {isImage && thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={HAJJ_DOCUMENT_LABELS[doc.documentType]}
              className="h-full w-full object-cover"
            />
          ) : isImage ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" aria-hidden="true" />
          ) : (
            <FileText className="h-8 w-8 text-gray-300" aria-hidden="true" />
          )}
        </span>
      </button>
      <div className="space-y-1.5 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {HAJJ_DOCUMENT_LABELS[doc.documentType]}
        </p>
        <p className="truncate text-xs font-medium text-gray-900">{doc.fileName}</p>
        <p className="text-[11px] text-gray-400">{prettySize(doc.fileSize)}</p>
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <Eye className="h-3 w-3" aria-hidden="true" /> Inspect
          </button>
          {canVerify && (
            <button
              onClick={() => void toggle()}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                doc.verified
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'border border-gray-200 text-gray-500 hover:text-gray-700',
              )}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {doc.verified ? 'Checked' : 'Mark checked'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-screen viewer — <img> for images, <iframe> for PDFs (served inline). */
function Lightbox({ doc, onClose }: { doc: HajjDocument; onClose: () => void }) {
  const { url, failed } = useReceiptUrl(doc.id);
  const isImage = doc.mimeType.startsWith('image/');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10001] flex flex-col bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-label={doc.fileName}
    >
      <div className="mb-3 flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-sm font-semibold">{HAJJ_DOCUMENT_LABELS[doc.documentType]}</p>
          <p className="text-xs text-white/60">{doc.fileName} · {prettySize(doc.fileSize)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url || undefined}
            download={doc.fileName}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20',
              !url && 'pointer-events-none opacity-50',
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
          </a>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {failed ? (
          <p className="rounded-xl bg-white/10 px-5 py-4 text-sm text-white">
            This receipt could not be loaded from storage.
          </p>
        ) : !url ? (
          <Loader2 className="h-7 w-7 animate-spin text-white/70" aria-label="Loading receipt" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={doc.fileName} className="max-h-full max-w-full rounded-lg object-contain" />
        ) : (
          <iframe src={url} title={doc.fileName} className="h-full w-full rounded-lg bg-white" />
        )}
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────

function label(status: string): string {
  return HAJJ_STATUS_LABELS[status as HajjStatus] ?? status;
}

function StatusBadge({ status }: { status: HajjStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
        HAJJ_STATUS_COLORS[status],
      )}
    >
      {HAJJ_STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'gray' | 'amber' | 'green' | 'red';
}) {
  const tones = {
    gray: 'bg-gray-50 text-gray-500',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  } as const;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn('break-words text-sm text-gray-900', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  disabled,
  icon: Icon,
  className,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50',
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
