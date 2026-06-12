'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search, AlertCircle, CheckCircle2, Heart, MapPin, Building2,
  Smartphone, Landmark, Banknote, Calendar, UserCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  getApplication, STATUS_FLOW, type MarriageApplication,
} from '@/lib/marriageApplications';

const PAYMENT_ICONS = { momo: Smartphone, bank: Landmark, cash: Banknote } as const;

export function MarriageStatusChecker() {
  const t = useTranslations('services.marriage');
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();

  const [id, setId] = useState('');
  const [result, setResult] = useState<MarriageApplication | null>(null);
  const [searched, setSearched] = useState(false);

  const lookup = (value: string) => {
    setResult(getApplication(value));
    setSearched(true);
  };

  // Auto-check when arriving with ?id= from the application success screen.
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setId(queryId);
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
            disabled={id.trim().length === 0}
            leftIcon={<Search className="w-4 h-4" />}
            className="!bg-gradient-to-br !from-rose-600 !to-rose-800 !text-white hover:!shadow-lg hover:!shadow-rose-900/30 focus:!ring-rose-500 sm:w-auto"
          >
            {t('status.checkButton')}
          </Button>
        </div>
      </form>

      {/* Not found */}
      {searched && !result && (
        <div className="flex gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-fade-in">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 mb-1">{t('status.notFoundTitle')}</h3>
            <p className="text-amber-900/80 text-sm leading-relaxed">{t('status.notFoundText')}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && <StatusResult app={result} locale={locale} />}
    </div>
  );
}

function StatusResult({ app, locale }: { app: MarriageApplication; locale: string }) {
  const t = useTranslations('services.marriage');
  const currentIndex = STATUS_FLOW.indexOf(app.status);

  const venueTitle = app.venue === 'mosque' ? t('apply.venueMosqueTitle') : t('apply.venueOutsideTitle');
  const VenueIcon = app.venue === 'mosque' ? Building2 : MapPin;
  const fee = app.venue === 'mosque' ? t('apply.feeMosque') : t('apply.feeOutside');
  const payment = t(`apply.pay${app.payment === 'momo' ? 'Momo' : app.payment === 'bank' ? 'Bank' : 'Cash'}`);
  const PaymentIcon = PAYMENT_ICONS[app.payment];

  const submitted = new Date(app.submittedAt).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 text-white p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Heart className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('status.detailsTitle')}</p>
            <p className="text-xl font-bold tracking-wider">{app.id}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail label={t('status.couple')} value={`${app.groomName} & ${app.brideName}`} icon={<Heart className="w-4 h-4" />} />
          <Detail label={t('status.submittedOn')} value={submitted} icon={<Calendar className="w-4 h-4" />} />
          <Detail
            label={t('status.location')}
            value={app.province ? `${t(`apply.provinces.${app.province}`)} — ${app.district}` : app.district}
            icon={<MapPin className="w-4 h-4" />}
          />
          <Detail label={t('status.venue')} value={`${venueTitle} — ${fee}`} icon={<VenueIcon className="w-4 h-4" />} />
          <Detail label={t('status.payment')} value={payment} icon={<PaymentIcon className="w-4 h-4" />} />
          <Detail label={t('status.officiant')} value={app.officiant} icon={<UserCheck className="w-4 h-4" />} />
        </div>
      </div>

      {/* Status tracker */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
        <h3 className="font-bold text-gray-900 mb-6">{t('status.currentStatus')}</h3>
        <ol className="relative">
          <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
          {STATUS_FLOW.map((stage, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                <span
                  className={cn(
                    'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                    done && 'bg-rose-600 text-white',
                    active && 'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-md shadow-rose-900/30',
                    !done && !active && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </span>
                <div className={cn('pt-1', !done && !active && 'opacity-50')}>
                  <p className={cn('font-semibold', active ? 'text-rose-700' : 'text-gray-900')}>
                    {t(`status.stages.${stage}`)}
                  </p>
                  <p className="text-gray-500 text-sm mt-0.5">{t(`status.stageDesc.${stage}`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
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
