'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Loader2, Briefcase, CheckCircle2, XCircle, AlertTriangle, Ban, LogIn, Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  jobsApi,
  JOB_STATUS_COLORS,
  type JobApplication,
  type JobApplicationStatus,
} from '@/lib/jobsApi';

// Public-facing linear flow — collapses the backend states into four milestones.
const PUBLIC_FLOW = ['submitted', 'review', 'shortlisted', 'decision'] as const;

const STAGE_TO_STATUS: Record<(typeof PUBLIC_FLOW)[number], JobApplicationStatus> = {
  submitted: 'submitted',
  review: 'under_review',
  shortlisted: 'shortlisted',
  decision: 'accepted',
};

function stageDateFor(
  stage: (typeof PUBLIC_FLOW)[number],
  application: JobApplication,
  locale: string,
): string | undefined {
  const target = STAGE_TO_STATUS[stage];
  const entry = application.statusHistory?.find((h) => h.toStatus === target);
  if (!entry) return undefined;
  return new Date(entry.changedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function stepIndexFor(status: JobApplicationStatus): number {
  switch (status) {
    case 'submitted':
      return 0;
    case 'under_review':
    case 'more_info_requested':
      return 1;
    case 'shortlisted':
      return 2;
    case 'accepted':
      return 3;
    default:
      return 0;
  }
}

export function JobsStatusChecker() {
  const t = useTranslations('services.jobs.status');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobApplication | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await jobsApi.listMine();
      setApplications(items);
      setSelected((prev) => (prev ? items.find((r) => r.id === prev.id) ?? null : null));
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
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <Button
          className="!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500"
          onClick={() => router.push(`/${locale}/login?redirect=/services/jobs/status`)}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          {t('signIn')}
        </Button>
      </div>
    );
  }

  if (selected) {
    return <ApplicationDetail application={selected} onBack={() => setSelected(null)} locale={locale} />;
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-500">{t('noRequests')}</p>
        <Button
          className="!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500"
          onClick={() => router.push(`/${locale}/services/jobs/apply`)}
        >
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
            <p className="font-semibold text-gray-900 truncate">{app.positionAppliedFor}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {app.trackingNumber} ·{' '}
              {new Date(app.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full shrink-0', JOB_STATUS_COLORS[app.status])}>
            {t(`statusLabel.${app.status}`)}
          </span>
        </button>
      ))}
    </div>
  );
}

function ApplicationDetail({
  application,
  onBack,
  locale,
}: {
  application: JobApplication;
  onBack: () => void;
  locale: string;
}) {
  const t = useTranslations('services.jobs.status');
  const currentIndex = stepIndexFor(application.status);
  const isAccepted = application.status === 'accepted';
  const isTerminal = application.status === 'rejected' || application.status === 'cancelled';

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6" />
        </svg>
        {t('checkAnother')}
      </button>

      {application.status === 'more_info_requested' && (
        <StateBanner
          tone="amber"
          icon={<AlertTriangle className="w-6 h-6" />}
          title={t('banner.moreInfoTitle')}
          text={application.moreInfoRequested || t('banner.moreInfoText')}
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
      {application.status === 'cancelled' && (
        <StateBanner tone="gray" icon={<Ban className="w-6 h-6" />} title={t('banner.cancelledTitle')} text={t('banner.cancelledText')} />
      )}

      <div className="rounded-2xl bg-emerald-950 text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Briefcase className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('detailsTitle')}</p>
            <p className="text-lg font-bold">{application.positionAppliedFor}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('submittedOn')} value={new Date(application.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })} />
          <Detail label={t('trackingNumber')} value={application.trackingNumber} />
        </div>
      </div>

      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex || (isAccepted && i <= currentIndex);
              const active = !done && i === currentIndex;
              const date = done ? stageDateFor(stage, application, locale) : undefined;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span
                    className={cn(
                      'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                      done && 'bg-emerald-600 text-white',
                      active && 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <div className={cn('pt-1 flex-1', !done && !active && 'opacity-50')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('font-semibold', active ? 'text-emerald-700' : 'text-gray-900')}>
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
    </div>
  );
}

function StateBanner({
  tone,
  icon,
  title,
  text,
}: {
  tone: 'amber' | 'red' | 'gray';
  icon: React.ReactNode;
  title: string;
  text: string;
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
