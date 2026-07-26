'use client';

import { useTranslations } from 'next-intl';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';
import { TenderTrackResult, type TenderTrackInfo } from './TenderTrackResult';

/**
 * Rail card that lets a bidder check their status in place: they type the bid
 * reference, confirm an SMS OTP sent to the phone on the bid, and the status
 * renders right here — no navigation, no login. Uses the shared OTP tracking
 * gate (TrackByOtp) against the public /tenders/applications/track endpoints.
 */
export function TenderStatusCard() {
  const t = useTranslations('services.tender.landing');

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <TrackByOtp<TenderTrackInfo>
        basePath="/tenders/applications/track"
        accent="green"
        title={t('statusTitle')}
        subtitle={t('statusText')}
        codePlaceholder={t('trackPlaceholder')}
        codeHint={t('trackHint')}
      >
        {(info) => <TenderTrackResult info={info} />}
      </TrackByOtp>
    </div>
  );
}
