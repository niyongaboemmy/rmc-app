'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogIn, Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TenderApplicationWizard } from '@/components/services/tender/TenderApplicationWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { tenderApplicationApi, type TenderApplication } from '@/lib/tenderApplicationApi';

function SignInPrompt({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.tender.apply');

  return (
    <main className="bg-gray-50/60 pattern-light py-8 lg:py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <button
          onClick={() => router.push(`/${locale}/login?redirect=/services/tender/apply`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-teal-500/20"
        >
          <LogIn className="w-4 h-4" /> {t('signInToApply')}
        </button>
        <p className="text-xs text-gray-400">
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/register`}
            className="text-teal-600 hover:underline font-medium"
          >
            {t('requestAccess')}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function TenderApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('services.tender.apply');

  const editId = searchParams.get('edit');
  // Deep link from a tender detail page — pre-selects and locks the tender picker.
  const tenderId = searchParams.get('tender') ?? undefined;

  const [editApplication, setEditApplication] = useState<TenderApplication | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  useEffect(() => {
    if (!editId || !isAuthenticated) return;
    setLoadingEdit(true);
    tenderApplicationApi
      .getById(editId)
      .then(setEditApplication)
      .catch(() => setEditApplication(null))
      .finally(() => setLoadingEdit(false));
  }, [editId, isAuthenticated]);

  // Unlike Good Conduct there's no "you already have an active request" redirect:
  // a bidder legitimately holds one live bid *per tender*, so a blank form is
  // always a valid thing to show. The duplicate check is per-tender, and the
  // backend raises a 409 the wizard surfaces if they re-bid the same one.

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(38vh, 300px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80"
          alt="Apply for a tender"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-teal-950/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shadow-xl shadow-teal-900/50 ring-1 ring-white/20">
                <Briefcase className="w-7 h-7 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
              {isAuthenticated ? t('heroTitle') : t('signInHeroTitle')}
            </h1>
            {!isAuthenticated && (
              <p className="text-white/70 text-base max-w-xl mx-auto mt-3 leading-relaxed">
                {t('signInHeroSubtitle')}
              </p>
            )}
          </div>
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
          <Link
            href={`/${locale}/services/tender`}
            className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToService')}
          </Link>
        </div>
      </section>

      {(isLoading || loadingEdit) && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {!isLoading && !loadingEdit && !isAuthenticated && <SignInPrompt locale={locale} />}

      {!isLoading && !loadingEdit && isAuthenticated && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {editApplication?.moreInfoRequested && (
            <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
              <strong>{t('moreInfoNoteLabel')}: </strong>
              {editApplication.moreInfoRequested}
            </div>
          )}
          <TenderApplicationWizard
            editApplication={editApplication ?? undefined}
            lockedTenderId={tenderId}
          />
        </main>
      )}

      <Footer />
    </div>
  );
}
