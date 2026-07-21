'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2, Heart, Calendar, XCircle, AlertTriangle, CheckCircle, Clock, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MarriagePublicStatus, type MarriageApplicationStatus } from '@/lib/marriageApi';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';

const ROLE_LABELS: Record<string, string> = {
  bride: 'Bride (Umugeni)',
  groom: 'Groom (Umugabo)',
  wali: 'Guardian (Wali)',
  imam: 'Officiating Imam',
};

const PUBLIC_FLOW = ['submitted', 'review', 'approved', 'ready'] as const;

function stepIndexFor(status: MarriageApplicationStatus): number {
  switch (status) {
    case 'draft':
    case 'submitted': return 0;
    case 'under_review':
    case 'amendments_requested': return 1;
    case 'approved':
    case 'completed': return 2;
    case 'closed': return 3;
    default: return 0;
  }
}

export function MarriageStatusChecker() {
  const { locale } = useParams<{ locale: string }>();
  return (
    <TrackByOtp<MarriagePublicStatus> basePath="/marriage/applications/track" accent="rose">
      {(app) => <StatusResult app={app} locale={locale} />}
    </TrackByOtp>
  );
}

function StatusResult({ app, locale }: { app: MarriagePublicStatus; locale: string }) {
  const t = useTranslations('services.marriage');
  const currentIndex = stepIndexFor(app.status);
  const isTerminal = app.status === 'rejected' || app.status === 'cancelled';
  const submitted = app.submittedAt
    ? new Date(app.submittedAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      {app.status === 'amendments_requested' && (
        <StateBanner tone="amber" icon={<AlertTriangle className="w-6 h-6" />} title={t('status.banner.amendmentsTitle')} text={t('status.banner.amendmentsText')} />
      )}
      {app.status === 'rejected' && (
        <StateBanner tone="red" icon={<XCircle className="w-6 h-6" />} title={t('status.banner.rejectedTitle')} text={app.rejectionReason || t('status.banner.rejectedText')} />
      )}
      {app.status === 'cancelled' && (
        <StateBanner tone="gray" icon={<XCircle className="w-6 h-6" />} title={t('status.banner.cancelledTitle')} text={t('status.banner.cancelledText')} />
      )}

      <div className="rounded-2xl bg-rmc-green-deep text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Heart className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('status.detailsTitle')}</p>
            <p className="text-xl font-bold tracking-wider">{app.trackingCode}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('status.couple')} value={`${app.groomName} & ${app.brideName}`} icon={<Heart className="w-4 h-4" />} />
          <Detail label={t('status.submittedOn')} value={submitted} icon={<Calendar className="w-4 h-4" />} />
        </div>
      </div>

      {app.parties.length > 0 && <PartyConfirmations parties={app.parties} />}

      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('status.currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex;
              const active = !done && i === currentIndex;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span className={cn(
                    'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                    done && 'bg-rose-600 text-white',
                    active && 'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-md',
                    !done && !active && 'bg-gray-100 text-gray-400',
                  )}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <div className={cn('pt-1', !done && !active && 'opacity-50')}>
                    <p className={cn('font-semibold', active ? 'text-rose-700' : 'text-gray-900')}>{t(`status.stages.${stage}`)}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{t(`status.stageDesc.${stage}`)}</p>
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

function PartyConfirmations({ parties }: { parties: { role: string; confirmedAt: string | null }[] }) {
  const allConfirmed = parties.every((p) => p.confirmedAt);
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-rmc-green/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-rmc-green" />
        </div>
        <h3 className="font-bold text-gray-900">Party Confirmations</h3>
        {allConfirmed && <span className="ml-auto text-xs font-semibold text-rmc-green bg-rmc-green/10 px-2.5 py-1 rounded-full">All confirmed</span>}
      </div>
      <ul className="space-y-3">
        {parties.map((p) => (
          <li key={p.role} className="flex items-center gap-3">
            {p.confirmedAt ? <CheckCircle className="w-5 h-5 text-rmc-green shrink-0" /> : <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[p.role] ?? p.role}</p>
              {p.confirmedAt && <p className="text-xs text-gray-400">Confirmed {new Date(p.confirmedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
            </div>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', p.confirmedAt ? 'bg-rmc-green/10 text-rmc-green' : 'bg-amber-50 text-amber-600')}>
              {p.confirmedAt ? 'Confirmed' : 'Pending'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StateBanner({ tone, icon, title, text }: { tone: 'amber' | 'red' | 'gray'; icon: React.ReactNode; title: string; text: string }) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  } as const;
  const iconTones = { amber: 'text-amber-600', red: 'text-red-600', gray: 'text-gray-500' } as const;
  return (
    <div className={cn('flex gap-4 border-2 rounded-2xl p-6', tones[tone])}>
      <span className={cn('shrink-0 mt-0.5', iconTones[tone])}>{icon}</span>
      <div>
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm leading-relaxed opacity-80">{text}</p>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-white/60 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-white/60 text-xs">{label}</p>
        <p className="font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}
