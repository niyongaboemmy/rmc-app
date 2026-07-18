'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Loader2,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Edit3,
  LogIn,
  Inbox,
  Trophy,
  FileText,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { resolveI18n } from '@/lib/tendersApi';
import {
  tenderApplicationApi,
  STATUS_COLORS,
  EDITABLE_STATUSES,
  type TenderApplication,
  type TenderApplicationStatus,
} from '@/lib/tenderApplicationApi';

/**
 * Public-facing linear flow — collapses the seven backend statuses into the
 * four milestones a bidder actually cares about. The branch/terminal states
 * (more_info_requested, rejected, withdrawn) get a dedicated banner instead of
 * a place on the timeline.
 */
const PUBLIC_FLOW = ['submitted', 'review', 'shortlisted', 'awarded'] as const;

const STAGE_TO_STATUS: Record<(typeof PUBLIC_FLOW)[number], TenderApplicationStatus> = {
  submitted: 'submitted',
  review: 'under_review',
  shortlisted: 'shortlisted',
  awarded: 'awarded',
};

function stageDateFor(
  stage: (typeof PUBLIC_FLOW)[number],
  application: TenderApplication,
  locale: string,
): string | undefined {
  const target = STAGE_TO_STATUS[stage];
  const entry = application.statusHistory?.find((h) => h.toStatus === target);
  if (!entry) return undefined;
  return new Date(entry.changedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function stepIndexFor(status: TenderApplicationStatus): number {
  switch (status) {
    case 'submitted':
      return 0;
    case 'under_review':
    case 'more_info_requested':
      return 1;
    case 'shortlisted':
      return 2;
    case 'awarded':
      return 3;
    default:
      return 0;
  }
}

export function TenderStatusChecker() {
  const t = useTranslations('services.tender.status');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<TenderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenderApplication | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await tenderApplicationApi.listMine();
      setApplications(items);
      // Re-point the open detail view at its refreshed copy, so an action taken
      // inside it (e.g. withdraw) shows the new status without closing the view.
      setSelected((prev) => (prev ? (items.find((a) => a.id === prev.id) ?? null) : null));
    } catch {
      setApplications([]);
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
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <Button
          onClick={() => router.push(`/${locale}/login?redirect=/services/tender/status`)}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          {t('signIn')}
        </Button>
      </div>
    );
  }

  if (selected) {
    return (
      <ApplicationDetail
        application={selected}
        locale={locale}
        onBack={() => setSelected(null)}
        onChanged={refresh}
      />
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-500">{t('noApplications')}</p>
        <Button onClick={() => router.push(`/${locale}/services/tender/apply`)}>
          {t('applyNow')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <button
          key={app.id}
          onClick={() => setSelected(app)}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {app.tender
                ? resolveI18n(app.tender.titleI18n, app.tender.title, locale)
                : t('unknownTender')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{app.applicationNumber}</p>
          </div>
          <span
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-full shrink-0',
              STATUS_COLORS[app.status],
            )}
          >
            {t(`statusLabel.${app.status}`)}
          </span>
        </button>
      ))}
    </div>
  );
}

function ApplicationDetail({
  application,
  locale,
  onBack,
  onChanged,
}: {
  application: TenderApplication;
  locale: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations('services.tender.status');
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);

  const currentIndex = stepIndexFor(application.status);
  const isAwarded = application.status === 'awarded';
  const isTerminal = application.status === 'rejected' || application.status === 'withdrawn';
  const canEdit = EDITABLE_STATUSES.includes(application.status);
  const canWithdraw = ['submitted', 'under_review', 'more_info_requested', 'shortlisted'].includes(
    application.status,
  );

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await tenderApplicationApi.withdraw(application.id);
      onChanged();
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
      >
        <ArrowLeftIcon /> {t('checkAnother')}
      </button>

      {isAwarded && (
        <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <Trophy className="w-8 h-8 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{t('awardedTitle')}</p>
            <p className="text-white/80 text-sm">{t('awardedText')}</p>
          </div>
        </div>
      )}

      {application.status === 'more_info_requested' && (
        <StateBanner
          tone="amber"
          icon={<AlertTriangle className="w-6 h-6" />}
          title={t('banner.moreInfoTitle')}
          text={application.moreInfoRequested || t('banner.moreInfoText')}
          action={
            <Button
              size="sm"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() =>
                router.push(`/${locale}/services/tender/apply?edit=${application.id}`)
              }
            >
              {t('editAndResubmit')}
            </Button>
          }
        />
      )}
      {application.status === 'rejected' && (
        <StateBanner
          tone="red"
          icon={<XCircle className="w-6 h-6" />}
          title={t('banner.rejectedTitle')}
          text={application.rejectionReason || t('banner.rejectedText')}
        />
      )}
      {application.status === 'withdrawn' && (
        <StateBanner
          tone="gray"
          icon={<Ban className="w-6 h-6" />}
          title={t('banner.withdrawnTitle')}
          text={t('banner.withdrawnText')}
        />
      )}

      {/* Summary card */}
      <div className="rounded-2xl bg-teal-950 text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Briefcase className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-white/70 text-xs">{t('detailsTitle')}</p>
            <p className="text-lg font-bold truncate">
              {application.tender
                ? resolveI18n(application.tender.titleI18n, application.tender.title, locale)
                : t('unknownTender')}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('reference')} value={application.applicationNumber} />
          <Detail label={t('company')} value={application.companyName} />
          <Detail
            label={t('submittedOn')}
            value={new Date(application.submittedAt).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          {application.bidAmount != null && (
            <Detail
              label={t('bidAmount')}
              value={`${Number(application.bidAmount).toLocaleString()} RWF`}
            />
          )}
        </div>
      </div>

      {/* Timeline */}
      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex || (isAwarded && i <= currentIndex);
              const active = !done && i === currentIndex;
              const date = done ? stageDateFor(stage, application, locale) : undefined;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span
                    className={cn(
                      'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                      done && 'bg-teal-600 text-white',
                      active && 'bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-md',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className={cn('pt-1 flex-1', !done && !active && 'opacity-50')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('font-semibold', active ? 'text-teal-700' : 'text-gray-900')}>
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

      {/* Submitted documents */}
      {application.documents.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-teal-500" /> {t('documentsTitle')}
          </h3>
          <ul className="space-y-2">
            {application.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t(`docType.${doc.docType}`)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
                </div>
                {doc.verified && (
                  <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full shrink-0">
                    {t('verified')}
                  </span>
                )}
                <a
                  href={fileUrl(doc.fileKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-teal-600 hover:underline shrink-0"
                >
                  {t('viewDocument')}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(canEdit || canWithdraw) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canEdit && (
            <Button
              variant="outline"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() => router.push(`/${locale}/services/tender/apply?edit=${application.id}`)}
            >
              {t('editBid')}
            </Button>
          )}
          {canWithdraw && (
            <Button variant="ghost" isLoading={withdrawing} onClick={handleWithdraw}>
              {t('withdrawBid')}
            </Button>
          )}
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
  const iconTones = {
    amber: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-gray-500',
  } as const;

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
