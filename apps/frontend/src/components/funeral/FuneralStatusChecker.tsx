'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Loader2, AlertCircle, UserRound, CalendarClock, Hash, ArrowRight } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import { buildStepLabels } from './stepLabels';
import { type FuneralRequest, type FuneralStepConfig } from './types';
import { FuneralTimeline } from './FuneralTimeline';
import { FuneralProgress } from './FuneralProgress';

type State = 'idle' | 'searching' | 'found' | 'notfound';

export function FuneralStatusChecker({ locale }: { locale: string }) {
  const t = useTranslations('services.funeral');
  const searchParams = useSearchParams();

  const [ref, setRef] = useState('');
  const [state, setState] = useState<State>('idle');
  const [request, setRequest] = useState<FuneralRequest | null>(null);
  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);
  const autoRan = useRef(false);

  // Load the live lifecycle steps (titles/descriptions/colors/icons).
  useEffect(() => {
    let active = true;
    funeralApi.listSteps()
      .then((res) => { if (active) setSteps(res); })
      .catch(() => {/* timeline still renders from request stages */});
    return () => { active = false; };
  }, []);

  const stepLabels = buildStepLabels(steps, locale);

  const timelineLabels = {
    ...stepLabels,
    status: {
      done: t('stageStatus.done'),
      active: t('stageStatus.active'),
      pending: t('stageStatus.pending'),
    },
    assigned: t('status.assigned'),
  };

  const runSearch = useCallback(async (value: string) => {
    const query = value.trim();
    if (!query) return;
    setState('searching');
    setRequest(null);
    const found = await funeralApi.getRequestByReference(query);
    if (found) {
      setRequest(found);
      setState('found');
    } else {
      setState('notfound');
    }
  }, []);

  // Deep link: /status?ref=FNL-DEMO auto-runs the lookup once.
  useEffect(() => {
    const q = searchParams.get('ref');
    if (q && !autoRan.current) {
      autoRan.current = true;
      setRef(q);
      runSearch(q);
    }
  }, [searchParams, runSearch]);

  const timeline = request?.timeline ?? [];
  const doneCount = timeline.filter((s) => s.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Lookup */}
      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(ref); }}
        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6"
      >
        <label htmlFor="funeral-ref" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
          {t('status.lookupLabel')}
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
            <input
              id="funeral-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={t('status.lookupPlaceholder')}
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3.5 text-sm uppercase text-gray-900 outline-none transition-colors placeholder:normal-case focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3.5 rtl:pr-9"
            />
          </div>
          <button
            type="submit"
            disabled={state === 'searching' || !ref.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'searching' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {state === 'searching' ? t('status.searching') : t('status.lookupButton')}
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-gray-400">{t('status.lookupHint')}</p>
      </form>

      {/* Not found */}
      {state === 'notfound' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">{t('status.notFoundTitle')}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-amber-900/80">{t('status.notFoundText')}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {state === 'found' && request && (
        <div className="space-y-5">
          {/* Summary + progress */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('status.summaryDeceased')}</p>
                <p className="text-lg font-bold text-gray-900">{request.deceased.fullName}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green-light px-3 py-1 font-mono text-[13px] font-bold text-rmc-green">
                <Hash className="h-3.5 w-3.5" aria-hidden="true" /> {request.reference}
              </span>
            </div>

            <FuneralProgress
              done={doneCount}
              total={timeline.length}
              label={t('status.progressLabel', { done: doneCount, total: timeline.length })}
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
                <CalendarClock className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
                <span className="text-[12px] text-gray-400">{t('status.currentStage')}:</span>
                <span className="text-[13px] font-semibold text-gray-800">{stepLabels.stages[request.stage] ?? request.stage}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
                <UserRound className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
                <span className="text-[12px] text-gray-400">{t('status.summarySubmitted')}:</span>
                <span className="text-[13px] font-semibold text-gray-800">
                  {new Date(request.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Link
                href={`/${locale}/services/funeral/detail/${encodeURIComponent(request.reference)}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rmc-green transition-colors hover:text-rmc-green-dark"
              >
                {t('detail.viewDetails')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
            <h2 className="mb-5 text-base font-bold text-gray-900">{t('status.timelineTitle')}</h2>
            <FuneralTimeline steps={timeline} labels={timelineLabels} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
