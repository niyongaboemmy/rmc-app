import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Search } from 'lucide-react';

/**
 * Rail card that sends an applicant to the status page.
 *
 * Occupies the same slot as the tenders board's TenderStatusCard, but links
 * rather than embedding the OTP gate. Tenders embeds it because a verified
 * bidder is handed straight to their editable bid; a scholarship applicant is
 * shown a status timeline, which already has its own page and would be cramped
 * into a 360px rail. The gate itself is identical either way — the code plus an
 * SMS OTP to the phone on file (migration 051).
 */
export async function ScholarshipStatusCard({ locale }: { locale: string }) {
  const t = await getTranslations('services.scholarship.landing');

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{t('statusTitle')}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{t('statusText')}</p>
      <Link
        href={`/${locale}/services/scholarship/status`}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rmc-green px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rmc-green-dark"
      >
        <Search className="h-3.5 w-3.5" /> {t('statusCta')}
      </Link>
    </div>
  );
}
