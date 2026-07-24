'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  MapPin,
  School,
  Calendar,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  scholarshipPublicApi,
  type ScholarshipApplication,
  type ScholarshipApplicationStatus,
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

function stageDateFor(app: ScholarshipApplication, stage: string): string | null {
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

export function ScholarshipStatusChecker() {
  const t = useTranslations('services.scholarship');
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();

  const [id, setId] = useState('');
  const [result, setResult] = useState<ScholarshipApplication | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (value: string) => {
    const num = value.trim();
    if (!num) return;
    setLoading(true);
    setSearched(true);
    try {
      const app = await scholarshipPublicApi.getByNumber(num);
      setResult(app);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-check when arriving with ?id= (from the application success screen).
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setId(queryId.toUpperCase());
      lookup(queryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(id);
  };

  return (
    <div className="space-y-8">
      {/* Search box */}
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label={t('status.idLabel')}
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder={t('status.idPlaceholder')}
              leftIcon={<Search className="w-4 h-4" />}
              inputSize="lg"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={id.trim().length === 0 || loading}
            leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            className="!bg-gradient-to-br !from-emerald-600 !to-emerald-800 !text-white hover:!shadow-lg hover:!shadow-emerald-900/30 focus:!ring-emerald-500 sm:w-auto"
          >
            {loading ? t('status.checking') : t('status.checkButton')}
          </Button>
        </div>
      </form>

      {/* Not found */}
      {searched && !loading && !result && (
        <div className="flex gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-fade-in">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 mb-1">{t('status.notFoundTitle')}</h3>
            <p className="text-amber-900/80 text-sm leading-relaxed">{t('status.notFoundText')}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!loading && result && <StatusResult app={result} locale={locale} />}
    </div>
  );
}

function StatusResult({ app, locale }: { app: ScholarshipApplication; locale: string }) {
  const t = useTranslations('services.scholarship');
  const currentIndex = stepIndexFor(app.status);
  const isTerminal = app.status === 'rejected' || app.status === 'cancelled';

  const submittedRaw = app.submittedAt ?? app.createdAt;
  const submitted = submittedRaw
    ? new Date(submittedRaw).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const location = [app.districtId, app.sectorId].filter(Boolean).length > 0
    ? [app.cell, app.village].filter(Boolean).join(' — ') || '—'
    : '—';

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
      <div className="rounded-2xl bg-emerald-950 text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
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
          <Detail label={t('apply.district')} value={location} icon={<MapPin className="w-4 h-4" />} />
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
                      done && 'bg-emerald-600 text-white',
                      active && 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md shadow-emerald-900/30',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <div className={cn('pt-1', !done && !active && 'opacity-50')}>
                    <p className={cn('font-semibold', active ? 'text-emerald-700' : 'text-gray-900')}>
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
