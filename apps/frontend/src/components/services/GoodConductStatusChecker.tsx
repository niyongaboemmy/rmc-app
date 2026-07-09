'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Loader2, ShieldCheck, CheckCircle2, XCircle,
  AlertTriangle, Ban, FileCheck, Edit3, LogIn, Inbox, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  goodConductApi,
  STATUS_COLORS,
  type GoodConductRequest,
  type GoodConductStatus,
} from '@/lib/goodConductApi';

// Public-facing linear progress flow — collapses the eight backend states into
// four milestones the applicant cares about. Branch/terminal states (rejected,
// cancelled, more_info_requested) get a dedicated banner instead.
const PUBLIC_FLOW = ['submitted', 'review', 'approved', 'ready'] as const;

// Maps each public-facing milestone to the backend status it corresponds to,
// so its completion date can be pulled straight from statusHistory.
const STAGE_TO_STATUS: Record<(typeof PUBLIC_FLOW)[number], GoodConductStatus> = {
  submitted: 'submitted',
  review: 'under_review',
  approved: 'approved',
  ready: 'closed',
};

function stageDateFor(
  stage: (typeof PUBLIC_FLOW)[number],
  request: GoodConductRequest,
  locale: string,
): string | undefined {
  const targetStatus = STAGE_TO_STATUS[stage];
  const entry = request.statusHistory?.find((h) => h.toStatus === targetStatus);
  if (!entry) return undefined;
  return new Date(entry.changedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function stepIndexFor(status: GoodConductStatus): number {
  switch (status) {
    case 'draft':
    case 'submitted':
      return 0;
    case 'under_review':
    case 'more_info_requested':
      return 1;
    case 'approved':
      return 2;
    case 'closed':
      return 3;
    default:
      return 0;
  }
}

export function GoodConductStatusChecker() {
  const t = useTranslations('services.conduct.status');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [requests, setRequests] = useState<GoodConductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GoodConductRequest | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await goodConductApi.listMine();
      setRequests(items);
      setSelected((prev) => (prev ? items.find((r) => r.id === prev.id) ?? null : null));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setLoading(false);
  }, [isAuthenticated, refresh]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <Button
          onClick={() => router.push(`/${locale}/login?redirect=/services/good-conduct/status`)}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          {t('signIn')}
        </Button>
      </div>
    );
  }

  if (selected) {
    return <RequestDetail request={selected} onBack={() => setSelected(null)} locale={locale} onChanged={refresh} />;
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-500">{t('noRequests')}</p>
        <Button onClick={() => router.push(`/${locale}/services/good-conduct/apply`)}>
          {t('applyNow')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <button
          key={req.id}
          onClick={() => setSelected(req)}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{req.fullNames}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(req.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full shrink-0', STATUS_COLORS[req.status])}>
            {t(`statusLabel.${req.status}`)}
          </span>
        </button>
      ))}
    </div>
  );
}

function RequestDetail({
  request,
  onBack,
  locale,
  onChanged,
}: {
  request: GoodConductRequest;
  onBack: () => void;
  locale: string;
  onChanged: () => void;
}) {
  const t = useTranslations('services.conduct.status');
  const router = useRouter();
  const currentIndex = stepIndexFor(request.status);
  const isClosed = request.status === 'closed';
  const isTerminal = request.status === 'rejected' || request.status === 'cancelled';

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
        <ArrowLeftIcon /> {t('checkAnother')}
      </button>

      {isClosed && (
        <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <FileCheck className="w-8 h-8 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{t('certificateReadyTitle')}</p>
            <p className="text-white/80 text-sm">{t('certificateReadyText')}</p>
          </div>
          <Link
            href={`/${locale}/certificates/good-conduct/${request.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" /> {t('downloadCertificate')}
          </Link>
        </div>
      )}

      {request.status === 'more_info_requested' && (
        <StateBanner
          tone="amber"
          icon={<AlertTriangle className="w-6 h-6" />}
          title={t('banner.moreInfoTitle')}
          text={request.moreInfoRequested || t('banner.moreInfoText')}
          action={
            <Button
              size="sm"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() => router.push(`/${locale}/services/good-conduct/apply?edit=${request.id}`)}
            >
              {t('editAndResubmit')}
            </Button>
          }
        />
      )}
      {request.status === 'rejected' && (
        <StateBanner
          tone="red"
          icon={<XCircle className="w-6 h-6" />}
          title={t('banner.rejectedTitle')}
          text={request.rejectionReason || t('banner.rejectedText')}
        />
      )}
      {request.status === 'cancelled' && (
        <StateBanner tone="gray" icon={<Ban className="w-6 h-6" />} title={t('banner.cancelledTitle')} text={t('banner.cancelledText')} />
      )}

      <div className="rounded-2xl bg-indigo-950 text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('detailsTitle')}</p>
            <p className="text-lg font-bold">{request.fullNames}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('submittedOn')} value={new Date(request.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })} />
          <Detail label={t('motifLabel')} value={t(`motif.${request.motif}`)} />
          <Detail label={t('paymentStatus')} value={t(`paymentStatusLabel.${request.paymentStatus}`)} />
          <Detail label={t('amountDue')} value={`${Number(request.amountDue).toLocaleString()} RWF`} />
          {request.certificateNumber && (
            <Detail label={t('certificateNumber')} value={request.certificateNumber} />
          )}
        </div>
      </div>

      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex || (isClosed && i <= currentIndex);
              const active = !done && i === currentIndex;
              const date = done ? stageDateFor(stage, request, locale) : undefined;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span
                    className={cn(
                      'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                      done && 'bg-indigo-600 text-white',
                      active && 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <div className={cn('pt-1 flex-1', !done && !active && 'opacity-50')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('font-semibold', active ? 'text-indigo-700' : 'text-gray-900')}>
                        {t(`stages.${stage}`)}
                      </p>
                      {date && <span className="text-xs text-gray-400 shrink-0">{date}</span>}
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">{t(`stageDesc.${stage}`)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {request.status === 'draft' && (
        <div className="text-center">
          <Button onClick={() => router.push(`/${locale}/services/good-conduct/apply?edit=${request.id}`)}>
            {t('continueToPayment')}
          </Button>
        </div>
      )}
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6" />
    </svg>
  );
}

function StateBanner({
  tone,
  icon,
  title,
  text,
  action,
}: {
  tone: 'amber' | 'red' | 'gray';
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  } as const;
  const iconTones = { amber: 'text-amber-600', red: 'text-red-600', gray: 'text-gray-500' } as const;
  return (
    <div className={cn('flex gap-4 border-2 rounded-2xl p-6', tones[tone])}>
      <span className={cn('shrink-0 mt-0.5', iconTones[tone])}>{icon}</span>
      <div className="flex-1">
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm leading-relaxed opacity-80">{text}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/60 text-xs">{label}</p>
      <p className="font-semibold break-words">{value}</p>
    </div>
  );
}
