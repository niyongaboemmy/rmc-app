'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  GraduationCap,
  School,
  Calendar,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';
import type {
  ScholarshipPublicStatus,
  ScholarshipApplicationStatus,
} from '@/lib/scholarshipApi';

// Public-facing linear progress flow — collapses the backend states into the four
// milestones an applicant cares about. Terminal states (rejected, cancelled) are
// surfaced with a dedicated banner instead.
const PUBLIC_FLOW = ['submitted', 'review', 'approved', 'confirmed'] as const;

function stepIndexFor(status: ScholarshipApplicationStatus): number {
  switch (status) {
    case 'draft':
    case 'submitted':
      return 0;
    case 'under_review':
      return 1;
    case 'approved':
      return 2;
    case 'confirmed':
      return 3;
    default:
      return 0;
  }
}

function stageDateFor(app: ScholarshipPublicStatus, stage: string): string | null {
  const hist = (s: string) => app.statusHistory?.find((h) => h.toStatus === s)?.changedAt ?? null;
  switch (stage) {
    case 'submitted':
      return app.submittedAt ?? hist('submitted') ?? app.createdAt;
    case 'review':
      return hist('under_review');
    case 'approved':
      return hist('approved');
    case 'confirmed':
      return hist('confirmed');
    default:
      return null;
  }
}

/**
 * Track a scholarship application.
 *
 * Gated by TrackByOtp, the same shared component hajj, marriage, tenders and job
 * applications use: the applicant gives their tracking code, an SMS goes to the
 * phone already on the record, and only a verified session sees anything.
 *
 * What this replaced typed an application NUMBER into a public lookup that
 * returned the whole record. The numbers run in sequence, so counting through
 * them walked the applicant list — national IDs, dates of birth, guardians'
 * phone numbers, for secondary-school students. See migration 051.
 */
export function ScholarshipStatusChecker() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.scholarship');

  return (
    <TrackByOtp<ScholarshipPublicStatus>
      basePath="/scholarship/applications/track"
      accent="green"
      // Placeholder is service-specific so the example carries the real RMC-SCH
      // prefix; the hint is identical for every service, so it falls back to the
      // shared `tracking` namespace rather than being restated here.
      codePlaceholder={t('status.idPlaceholder')}
    >
      {(app) => <StatusResult app={app} locale={locale} />}
    </TrackByOtp>
  );
}

function StatusResult({ app, locale }: { app: ScholarshipPublicStatus; locale: string }) {
  const t = useTranslations('services.scholarship');
  // Reuses the registration form's label rather than adding a fourth translation
  // of the same two words.
  const tMember = useTranslations('member.register');
  const currentIndex = stepIndexFor(app.status);
  const isTerminal = app.status === 'rejected' || app.status === 'cancelled';

  const submittedRaw = app.submittedAt ?? app.createdAt;
  const submitted = submittedRaw
    ? new Date(submittedRaw).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  // Location is deliberately absent from the tracked projection — it is part of
  // the applicant's identity, not their case's progress. Education level used to
  // sit here on the same reasoning, but the form had stopped asking for it and
  // sent 'university' for everyone, so it confirmed nothing. The school name
  // above does the job it was supposed to.

  return (
    <div className="animate-fade-up space-y-6">
      {/* Terminal state banners */}
      {app.status === 'rejected' && (
        <StateBanner
          tone="red"
          icon={<XCircle className="w-6 h-6" />}
          title={t('status.banner.rejectedTitle')}
          text={app.rejectionReason || t('status.banner.rejectedText')}
        />
      )}
      {app.status === 'cancelled' && (
        <StateBanner
          tone="gray"
          icon={<XCircle className="w-6 h-6" />}
          title={t('status.banner.cancelledTitle')}
          text={t('status.banner.cancelledText')}
        />
      )}

      {/* Header card */}
      <div className="rounded-2xl bg-rmc-green-deep text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('status.detailsTitle')}</p>
            <p className="text-xl font-bold tracking-wider">{app.applicationNumber}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('status.applicant')} value={app.fullNames} icon={<GraduationCap className="w-4 h-4" />} />
          <Detail label={t('status.submittedOn')} value={submitted} icon={<Calendar className="w-4 h-4" />} />
          <Detail label={t('status.school')} value={app.schoolName} icon={<School className="w-4 h-4" />} />
        </div>
      </div>

      {/* Status tracker — hidden for terminal states (a banner already explains them) */}
      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('status.currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex;
              const active = !done && i === currentIndex;
              const rawDate = done || active ? stageDateFor(app, stage) : null;
              const dateLabel = rawDate
                ? new Date(rawDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
                : null;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span
                    className={cn(
                      'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                      done && 'bg-rmc-green text-white',
                      active && 'bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green-dark/30',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <div className={cn('pt-1', !done && !active && 'opacity-50')}>
                    <p className={cn('font-semibold', active ? 'text-rmc-green-dark' : 'text-gray-900')}>
                      {t(`status.stages.${stage}`)}
                    </p>
                    <p className="text-gray-500 text-sm mt-0.5">{t(`status.stageDesc.${stage}`)}</p>
                    {dateLabel && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateLabel}
                      </p>
                    )}
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
  tone: 'red' | 'gray';
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  const tones = {
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  } as const;
  const iconTones = { red: 'text-red-600', gray: 'text-gray-500' } as const;
  return (
    <div className={cn('flex gap-4 border-2 rounded-2xl p-6 animate-fade-in', tones[tone])}>
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
