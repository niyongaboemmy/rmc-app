'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { hajjApi, type HajjApplicationPublic, type HajjStatus } from '@/lib/hajjApi';
import { cn } from '@/lib/utils';

/** The happy path, in order. `rejected` is a terminal branch off `under_review`. */
const TIMELINE: Exclude<HajjStatus, 'rejected'>[] = ['submitted', 'under_review', 'approved'];

const STEP_ICON = {
  submitted: FileText,
  under_review: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

export function HajjStatusChecker() {
  const t = useTranslations('services.hajj.status');
  const params = useSearchParams();

  const [number, setNumber] = useState('');
  const [app, setApp] = useState<HajjApplicationPublic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(
    async (value: string) => {
      const num = value.trim();
      if (!num) return;
      setLoading(true);
      setError('');
      setApp(null);
      try {
        setApp(await hajjApi.getByNumber(num));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(status === 404 ? t('notFound') : t('error'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  // Deep link from the submission screen: /status?number=RMC-HAJ-…
  useEffect(() => {
    const fromUrl = params.get('number');
    if (fromUrl) {
      setNumber(fromUrl.toUpperCase());
      void lookup(fromUrl);
    }
  }, [params, lookup]);

  const rejected = app?.status === 'rejected';
  const reachedIndex = app ? TIMELINE.indexOf(app.status as (typeof TIMELINE)[number]) : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('sub')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(number);
        }}
        className="mt-6 flex flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm tracking-wide text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !number.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rmc-green px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {t('check')}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      )}

      {app && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
            <p className="text-lg font-bold tracking-wide text-rmc-green">{app.applicationNumber}</p>
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
                          done
                            ? 'bg-rmc-green text-white ring-rmc-green/20'
                            : 'bg-gray-50 text-gray-300 ring-gray-200',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="pt-1">
                        <p className={cn('text-sm font-semibold', done ? 'text-gray-900' : 'text-gray-400')}>
                          {t(`steps.${step}`)}
                        </p>
                        {current && (
                          <p className="mt-1 text-xs leading-relaxed text-gray-500">{t(`stepHint.${step}`)}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50/40 px-5 py-3 text-xs text-gray-500">
            <p>
              {t('submittedOn')}:{' '}
              <span className="font-medium text-gray-700">
                {new Date(app.submittedAt).toLocaleDateString()}
              </span>
            </p>
            <p className="text-right">
              {t('lastUpdate')}:{' '}
              <span className="font-medium text-gray-700">
                {new Date(app.updatedAt).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>
      )}
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
