'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { type HajjApplicationPublic, type HajjStatus } from '@/lib/hajjApi';
import { cn } from '@/lib/utils';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';

/** The happy path, in order. `rejected` is a terminal branch off `under_review`. */
const TIMELINE: Exclude<HajjStatus, 'rejected'>[] = ['submitted', 'under_review', 'approved'];

const STEP_ICON = {
  submitted: FileText,
  under_review: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

export function HajjStatusChecker() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <TrackByOtp<HajjApplicationPublic> basePath="/hajj/applications/track" accent="green">
        {(app) => <HajjResult app={app} />}
      </TrackByOtp>
    </div>
  );
}

function HajjResult({ app }: { app: HajjApplicationPublic }) {
  const t = useTranslations('services.hajj.status');
  const rejected = app.status === 'rejected';
  const reachedIndex = TIMELINE.indexOf(app.status as (typeof TIMELINE)[number]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <p className="text-lg font-bold tracking-wide text-rmc-green">{app.trackingCode}</p>
        <p className="mt-0.5 text-sm text-gray-600">
          {t('applicant')}: <span className="font-medium text-gray-900">{app.fullName}</span>
        </p>
      </div>

      <div className="px-5 py-6">
        {rejected ? (
          <RejectedPanel app={app} />
        ) : (
          <ol className="space-y-5">
            {TIMELINE.map((step, i) => {
              const done = i <= reachedIndex;
              const current = i === reachedIndex;
              const Icon = STEP_ICON[step];
              return (
                <li key={step} className="flex gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1',
                      done ? 'bg-rmc-green text-white ring-rmc-green/20' : 'bg-gray-50 text-gray-300 ring-gray-200',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="pt-1">
                    <p className={cn('text-sm font-semibold', done ? 'text-gray-900' : 'text-gray-400')}>
                      {t(`steps.${step}`)}
                    </p>
                    {current && <p className="mt-1 text-xs leading-relaxed text-gray-500">{t(`stepHint.${step}`)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50/40 px-5 py-3 text-xs text-gray-500">
        <p>
          {t('submittedOn')}: <span className="font-medium text-gray-700">{new Date(app.submittedAt).toLocaleDateString()}</span>
        </p>
        <p className="text-right">
          {t('lastUpdate')}: <span className="font-medium text-gray-700">{new Date(app.updatedAt).toLocaleDateString()}</span>
        </p>
      </div>
    </div>
  );
}

function RejectedPanel({ app }: { app: HajjApplicationPublic }) {
  const t = useTranslations('services.hajj.status');
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
        <XCircle className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="pt-1">
        <p className="text-sm font-semibold text-gray-900">{t('steps.rejected')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('stepHint.rejected')}</p>
        {app.rejectionReason && (
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-500">{t('reason')}</p>
            <p className="mt-1 text-sm leading-relaxed text-red-800">{app.rejectionReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
