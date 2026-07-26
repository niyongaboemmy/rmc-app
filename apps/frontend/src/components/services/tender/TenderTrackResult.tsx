'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { resolveI18n } from '@/lib/tendersApi';
import { STATUS_COLORS, type TenderApplicationStatus } from '@/lib/tenderApplicationApi';

/** The PII-safe shape the OTP-verified tender tracking lookup returns. */
export interface TenderTrackInfo {
  applicationNumber: string;
  companyName: string;
  tenderTitle: string | null;
  tenderTitleI18n: { en: string; rw: string; ar: string } | null;
  status: TenderApplicationStatus;
  moreInfoRequested: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** Compact status view for the tenders-page rail — reuses the status i18n. */
export function TenderTrackResult({ info }: { info: TenderTrackInfo }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.tender.status');
  const title = resolveI18n(info.tenderTitleI18n, info.tenderTitle ?? '', locale);

  return (
    <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-semibold text-rmc-green">{info.applicationNumber}</p>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_COLORS[info.status])}>
          {t(`statusLabel.${info.status}`)}
        </span>
      </div>

      {title && <p className="text-sm font-semibold leading-snug text-gray-900">{title}</p>}

      <div className="space-y-1 text-xs text-gray-500">
        <p>
          {t('company')}: <span className="font-medium text-gray-700">{info.companyName}</span>
        </p>
        <p>
          {t('submittedOn')}:{' '}
          <span className="font-medium text-gray-700">
            {new Date(info.submittedAt).toLocaleDateString(locale)}
          </span>
        </p>
      </div>

      {info.status === 'more_info_requested' && info.moreInfoRequested && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {t('banner.moreInfoTitle')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800">{info.moreInfoRequested}</p>
        </div>
      )}

      {info.status === 'rejected' && info.rejectionReason && (
        <div className="rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
            {t('banner.rejectedTitle')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-red-700">{info.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
