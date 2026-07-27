'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';
import { storeBidSession } from '@/lib/bidSession';
import type { TenderTrackInfo } from '@/lib/tenderApplicationApi';

/**
 * Rail card that starts the bidder's status check: they type the bid reference
 * and confirm an SMS OTP sent to the phone on the bid — no login. On success we
 * hand off to the bid page, which shows the whole bid and lets them correct it
 * while it is still editable, rather than rendering a summary in this narrow
 * rail. Uses the shared OTP gate (TrackByOtp) against the public
 * /tenders/applications/track endpoints.
 */
export function TenderStatusCard() {
  const t = useTranslations('services.tender.landing');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <TrackByOtp<TenderTrackInfo>
        basePath="/tenders/applications/track"
        accent="green"
        title={t('statusTitle')}
        subtitle={t('statusText')}
        codePlaceholder={t('trackPlaceholder')}
        codeHint={t('trackHint')}
        onVerified={(_info, session) => {
          // The bid itself is re-fetched by the destination page from this token,
          // so nothing about the bid travels through the URL.
          storeBidSession(session.token);
          router.push(`/${locale}/tenders/bid`);
        }}
      />
    </div>
  );
}
