'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Modal, ModalHeader, ModalTitle, ModalBody } from '@/components/ui/Modal';
import { TenderApplicationWizard } from './TenderApplicationWizard';

/**
 * Opens the bid-submission wizard in a modal with this tender pre-selected and
 * locked, so a bidder can apply without leaving the detail page. Submitting a bid
 * requires a signed-in RMC account (the endpoint is auth-scoped), so a logged-out
 * visitor gets a sign-in prompt inside the modal instead of the form.
 */
export function TenderApplyButton({ tenderId, label }: { tenderId: string; label: string }) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const t = useTranslations('services.tender.apply');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rmc-green-dark"
      >
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{t('heroTitle')}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {isAuthenticated ? (
            <TenderApplicationWizard lockedTenderId={tenderId} />
          ) : (
            <div className="space-y-4 py-6 text-center">
              <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
              <button
                type="button"
                onClick={() => router.push(`/${locale}/login?redirect=/tenders/${tenderId}`)}
                className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
              >
                <LogIn className="h-4 w-4" /> {t('signInToApply')}
              </button>
            </div>
          )}
        </ModalBody>
      </Modal>
    </>
  );
}
