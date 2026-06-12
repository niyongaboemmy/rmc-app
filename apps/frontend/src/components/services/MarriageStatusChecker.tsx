'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Search, AlertCircle, CheckCircle2, Heart, MapPin, Building2,
  Calendar, UserCheck, Clock, XCircle, AlertTriangle, Download,
  RefreshCw, FileText, Loader2, Info, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  marriageApi, MarriageApplication, MarriageApplicationStatus,
} from '@/lib/marriageApi';

// ── Static maps ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MarriageApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  amendments_requested: 'Amendments Requested',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Certificate Issued',
};

const STATUS_DOT: Record<MarriageApplicationStatus, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  under_review: 'bg-amber-500',
  amendments_requested: 'bg-orange-500',
  approved: 'bg-green-500',
  completed: 'bg-emerald-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-400',
  closed: 'bg-purple-500',
};

const STATUS_TEXT: Record<MarriageApplicationStatus, string> = {
  draft: 'text-gray-600',
  submitted: 'text-blue-700',
  under_review: 'text-amber-700',
  amendments_requested: 'text-orange-700',
  approved: 'text-green-700',
  completed: 'text-emerald-700',
  rejected: 'text-red-700',
  cancelled: 'text-gray-500',
  closed: 'text-purple-700',
};

const PIPELINE: MarriageApplicationStatus[] = [
  'submitted', 'under_review', 'amendments_requested', 'approved', 'completed', 'closed',
];

// ── Root component ─────────────────────────────────────────────────────────────

export function MarriageStatusChecker() {
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [app, setApp] = useState<MarriageApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const lookup = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const result = await marriageApi.getByNumber(id.trim().toUpperCase());
      setApp(result);
      setSearched(true);
      setLastRefreshed(new Date());
    } catch {
      setApp(null);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setQuery(queryId);
      lookup(queryId);
    }
  }, []);

  useEffect(() => {
    if (!app || ['rejected', 'cancelled', 'closed'].includes(app.status)) return;
    const interval = setInterval(() => lookup(app.applicationNumber), 30_000);
    return () => clearInterval(interval);
  }, [app, lookup]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  return (
    <div className="space-y-5">
      {/* ── Search card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <form onSubmit={onSubmit}>
          <div className="flex items-stretch">
            <div className="flex items-center pl-4 text-gray-400">
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                : <Search className="w-4 h-4" />
              }
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="e.g. RMC-MR-202606-00001"
              className="flex-1 py-4 px-3 text-sm font-mono text-gray-900 placeholder:text-gray-400 placeholder:font-sans bg-transparent outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={query.trim().length === 0 || loading}
              className="m-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors shrink-0"
            >
              Check Status
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {lastRefreshed && !loading && (
          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-1.5 text-[11px] text-gray-400">
            <RefreshCw className="w-3 h-3" />
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {app && !['rejected', 'cancelled', 'closed'].includes(app.status) && (
              <span className="ml-1 text-rose-400">· auto-refreshing</span>
            )}
          </div>
        )}
      </div>

      {/* ── Not found ── */}
      {searched && !app && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex gap-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">No application found</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              We couldn't find an application matching{' '}
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{query}</span>.
              Application IDs look like{' '}
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">RMC-MR-202606-00001</span>.
            </p>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {app && <StatusResult app={app} locale={locale} />}
    </div>
  );
}

// ── Result panel ───────────────────────────────────────────────────────────────

function StatusResult({ app, locale }: { app: MarriageApplication; locale: string }) {
  const currentPipelineIndex = PIPELINE.indexOf(app.status);
  const isTerminal = ['rejected', 'cancelled', 'closed'].includes(app.status);

  const submittedDate = app.submittedAt
    ? new Date(app.submittedAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(app.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-4">
      {/* ── Identity card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Thin accent top bar keyed to status */}
        <div className={cn('h-1', STATUS_DOT[app.status])} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Application ID</p>
              <p className="font-mono text-xl font-bold text-gray-900">{app.applicationNumber}</p>
            </div>
            <StatusPill status={app.status} />
          </div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Couple" icon={<Heart className="w-3.5 h-3.5" />}>
              {app.groomName} &amp; {app.brideName}
            </Field>
            <Field label="Submitted" icon={<Calendar className="w-3.5 h-3.5" />}>
              {submittedDate}
            </Field>
            <Field
              label="Venue"
              icon={app.venueType === 'mosque' ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
            >
              {app.venueType === 'mosque' ? 'Mosque ceremony' : 'Outside mosque'}
              {app.province && <span className="text-gray-400"> · {app.province}</span>}
            </Field>
            <Field label="Payment" icon={<FileText className="w-3.5 h-3.5" />}>
              <PaymentLabel app={app} />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Status alerts ── */}
      {app.status === 'amendments_requested' && (
        <Alert variant="orange" icon={<AlertTriangle className="w-4 h-4" />} title="Amendments Required">
          {app.amendmentsRequestedText ?? 'Additional information or documents are required.'}
          <span className="block mt-1 text-xs opacity-70">Please contact RMC to submit the required amendments.</span>
        </Alert>
      )}

      {app.status === 'rejected' && (
        <Alert variant="red" icon={<XCircle className="w-4 h-4" />} title="Application Rejected">
          {app.rejectionReason ?? 'Your application was not approved.'}
          <span className="block mt-1 text-xs opacity-70">You may submit a new application. Contact RMC for guidance.</span>
        </Alert>
      )}

      {app.status === 'approved' && app.ceremonyDate && (
        <Alert variant="green" icon={<CheckCircle2 className="w-4 h-4" />} title="Application Approved">
          Ceremony scheduled for{' '}
          <strong>
            {new Date(app.ceremonyDate).toLocaleDateString(locale, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </strong>.
          {app.reviewNotes && <span className="block mt-1 text-xs opacity-70">{app.reviewNotes}</span>}
        </Alert>
      )}

      {app.status === 'closed' && (
        <Alert variant="purple" icon={<Download className="w-4 h-4" />} title="Certificate Issued">
          {app.certificateIssuedAt
            ? `Issued on ${new Date(app.certificateIssuedAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}.`
            : 'Your marriage certificate has been issued.'}
          {app.certificateUrl ? (
            <a
              href={app.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Certificate
            </a>
          ) : (
            <span className="block mt-1 text-xs opacity-70">Contact RMC to obtain your certificate.</span>
          )}
        </Alert>
      )}

      {/* ── Payment pending block ── */}
      {app.paymentStatus !== 'paid' && !isTerminal && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-amber-600 mb-3">Payment Required</p>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-2xl font-bold text-gray-900">
              {Number(app.amountDue).toLocaleString()} <span className="text-sm font-normal text-gray-400">RWF</span>
            </p>
            <span className="text-xs text-amber-700 font-medium">Pending</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            {app.paymentMethod === 'cash' && (
              <>Visit the RMC office with your application ID <code className="font-mono bg-gray-100 px-1 rounded">{app.applicationNumber}</code> to pay in cash.</>
            )}
            {app.paymentMethod === 'bank' && (
              <>Transfer to Bank of Kigali, Acc <span className="font-mono">00012-345678-01</span>. Use <code className="font-mono bg-gray-100 px-1 rounded">{app.applicationNumber}</code> as the reference.</>
            )}
            {app.paymentMethod === 'momo' && (
              <>Dial <span className="font-mono">*182#</span> → Pay Bills → RMC Services. Reference: <code className="font-mono bg-gray-100 px-1 rounded">{app.applicationNumber}</code>.</>
            )}
          </p>
        </div>
      )}

      {/* ── Progress timeline ── */}
      {!['rejected', 'cancelled'].includes(app.status) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-6">Progress</p>
          <ol className="space-y-0">
            {PIPELINE.map((stage, i) => {
              const isDone = currentPipelineIndex > i;
              const isActive = currentPipelineIndex === i;
              const isFuture = currentPipelineIndex < i;
              const history = app.statusHistory?.find((h) => h.toStatus === stage);
              const isLast = i === PIPELINE.length - 1;

              return (
                <li key={stage} className="flex gap-4">
                  {/* Dot + connector */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white transition-all',
                      isDone && 'bg-rose-600',
                      isActive && 'bg-rose-600 shadow-md shadow-rose-200 scale-110',
                      isFuture && 'bg-gray-100',
                    )}>
                      {isDone
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        : isActive
                        ? <span className="w-2 h-2 rounded-full bg-white" />
                        : <span className="w-2 h-2 rounded-full bg-gray-300" />
                      }
                    </div>
                    {!isLast && (
                      <div className={cn('w-px flex-1 my-1', isDone ? 'bg-rose-200' : 'bg-gray-100')} style={{ minHeight: 24 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn('pb-6 flex-1 pt-0.5', isLast && 'pb-0', isFuture && 'opacity-35')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-semibold', isActive ? 'text-rose-700' : isDone ? 'text-gray-700' : 'text-gray-400')}>
                        {STATUS_LABELS[stage]}
                      </p>
                      {history && (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {new Date(history.changedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className={cn('text-xs mt-0.5 leading-relaxed', isActive ? 'text-rose-600/70' : 'text-gray-400')}>
                      {getStageDescription(stage, app)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: MarriageApplicationStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100',
      STATUS_TEXT[status],
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">
        <span className="text-gray-300">{icon}</span>
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800">{children}</p>
    </div>
  );
}

function PaymentLabel({ app }: { app: MarriageApplication }) {
  if (app.paymentStatus === 'paid') return <span className="text-green-600">Paid</span>;
  if (app.paymentStatus === 'pending_cash') return <span className="text-amber-600">Pending — visit RMC office</span>;
  if (app.paymentStatus === 'processing') return <span className="text-blue-600">Transfer pending</span>;
  return (
    <span className="text-amber-600">
      {Number(app.amountDue).toLocaleString()} RWF — unpaid
    </span>
  );
}

type AlertVariant = 'orange' | 'red' | 'green' | 'purple';
const ALERT_STYLES: Record<AlertVariant, string> = {
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  red:    'border-red-200 bg-red-50 text-red-900',
  green:  'border-green-200 bg-green-50 text-green-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-900',
};
const ALERT_ICON_STYLES: Record<AlertVariant, string> = {
  orange: 'bg-orange-100 text-orange-600',
  red:    'bg-red-100 text-red-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
};

function Alert({ variant, icon, title, children }: {
  variant: AlertVariant;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border shadow-sm p-5', ALERT_STYLES[variant])}>
      <div className="flex gap-3">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', ALERT_ICON_STYLES[variant])}>
          {icon}
        </div>
        <div className="pt-0.5 flex-1">
          <p className="font-semibold text-sm mb-1">{title}</p>
          <p className="text-sm leading-relaxed opacity-80">{children}</p>
        </div>
      </div>
    </div>
  );
}

function getStageDescription(stage: MarriageApplicationStatus, app: MarriageApplication): string {
  switch (stage) {
    case 'submitted': return 'Application received and queued for review.';
    case 'under_review': return 'An RMC officer is reviewing your application and documents.';
    case 'amendments_requested': return app.amendmentsRequestedText
      ? `Required: ${app.amendmentsRequestedText}`
      : 'Additional information or documents required.';
    case 'approved': return app.ceremonyDate
      ? `Ceremony scheduled for ${new Date(app.ceremonyDate).toLocaleDateString()}`
      : 'Approved — ceremony date will be confirmed.';
    case 'completed': return 'Nikah ceremony has been performed.';
    case 'closed': return 'Official marriage certificate has been issued.';
    default: return '';
  }
}
