'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Loader2, CheckCircle2, XCircle, Ban, AlertTriangle } from 'lucide-react';
import {
  jobsApi,
  JOB_STATUS_COLORS,
  type JobApplicationPublicStatus,
  type JobApplicationStatus,
} from '@/lib/jobsApi';
import { cn } from '@/lib/utils';

const PUBLIC_FLOW = ['submitted', 'review', 'shortlisted', 'decision'] as const;
const STAGE_TO_STATUS: Record<(typeof PUBLIC_FLOW)[number], string> = {
  submitted: 'submitted',
  review: 'under_review',
  shortlisted: 'shortlisted',
  decision: 'accepted',
};

function stepIndexFor(status: JobApplicationStatus): number {
  switch (status) {
    case 'submitted': return 0;
    case 'under_review':
    case 'more_info_requested': return 1;
    case 'shortlisted': return 2;
    case 'accepted': return 3;
    default: return 0;
  }
}

export function JobsTrackByNumber() {
  const t = useTranslations('services.jobs.status');
  const { locale } = useParams<{ locale: string }>();

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobApplicationPublicStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const res = await jobsApi.track(value);
    if (res) setResult(res);
    else setNotFound(true);
    setLoading(false);
  };

  const isTerminal = result && (result.status === 'rejected' || result.status === 'cancelled');
  const isAccepted = result?.status === 'accepted';
  const currentIndex = result ? stepIndexFor(result.status) : 0;

  const stageDate = (stage: (typeof PUBLIC_FLOW)[number]) => {
    const entry = result?.statusHistory?.find((h) => h.toStatus === STAGE_TO_STATUS[stage]);
    return entry ? new Date(entry.changedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-500" /> {t('trackTitle')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('trackSubtitle')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setNotFound(false); }}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder={t('trackPlaceholder')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          onClick={lookup}
          disabled={loading || !value.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {t('trackButton')}
        </button>
      </div>

      {notFound && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
          {t('trackNotFound')}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900">{result.positionAppliedFor}</p>
              <p className="text-xs text-gray-400 font-mono">{result.trackingNumber} · {result.fullNames}</p>
            </div>
            <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', JOB_STATUS_COLORS[result.status])}>
              {t(`statusLabel.${result.status}`)}
            </span>
          </div>

          {result.status === 'rejected' && (
            <StateNote tone="red" icon={<XCircle className="w-5 h-5" />} title={t('banner.rejectedTitle')} text={t('banner.rejectedText')} />
          )}
          {result.status === 'cancelled' && (
            <StateNote tone="gray" icon={<Ban className="w-5 h-5" />} title={t('banner.cancelledTitle')} text={t('banner.cancelledText')} />
          )}
          {result.status === 'more_info_requested' && (
            <StateNote tone="amber" icon={<AlertTriangle className="w-5 h-5" />} title={t('banner.moreInfoTitle')} text={t('banner.moreInfoText')} />
          )}

          {!isTerminal && (
            <ol className="relative pt-1">
              <div className="absolute start-[11px] top-3 bottom-3 w-px bg-gray-200" />
              {PUBLIC_FLOW.map((stage, i) => {
                const done = i < currentIndex || (isAccepted && i <= currentIndex);
                const active = !done && i === currentIndex;
                const date = done ? stageDate(stage) : undefined;
                return (
                  <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
                    <span className={cn(
                      'relative z-10 w-6 h-6 shrink-0 rounded-full flex items-center justify-center ring-4 ring-gray-50',
                      done && 'bg-emerald-600 text-white',
                      active && 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white',
                      !done && !active && 'bg-gray-200 text-gray-400',
                    )}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                    </span>
                    <div className={cn('pt-0.5 flex-1', !done && !active && 'opacity-50')}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm font-semibold', active ? 'text-emerald-700' : 'text-gray-900')}>{t(`stages.${stage}`)}</p>
                        {date && <span className="text-xs text-gray-400 shrink-0">{date}</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{t(`stageDesc.${stage}`)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function StateNote({ tone, icon, title, text }: { tone: 'red' | 'gray' | 'amber'; icon: React.ReactNode; title: string; text: string }) {
  const tones = {
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  } as const;
  const iconTones = { red: 'text-red-600', gray: 'text-gray-500', amber: 'text-amber-600' } as const;
  return (
    <div className={cn('flex gap-3 border rounded-xl p-4', tones[tone])}>
      <span className={cn('shrink-0 mt-0.5', iconTones[tone])}>{icon}</span>
      <div>
        <p className="font-bold text-sm mb-0.5">{title}</p>
        <p className="text-xs leading-relaxed opacity-80">{text}</p>
      </div>
    </div>
  );
}
