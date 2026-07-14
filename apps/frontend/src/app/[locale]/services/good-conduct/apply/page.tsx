'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HeroBackLink } from '@/components/services/HeroBackLink';
import { GoodConductWizard } from '@/components/services/good-conduct/GoodConductWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { goodConductApi, type GoodConductRequest } from '@/lib/goodConductApi';

function RequirementsView({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.conduct.apply');

  return (
    <main className="bg-gray-50/60 pattern-light py-8 lg:py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <button
          onClick={() => router.push(`/${locale}/login?redirect=/services/good-conduct/apply`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20"
        >
          <LogIn className="w-4 h-4" /> {t('signInToApply')}
        </button>
        <p className="text-xs text-gray-400">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-indigo-600 hover:underline font-medium">
            {t('requestAccess')}
          </Link>
        </p>
      </div>
    </main>
  );
}

// Statuses the wizard can still edit — mirrors the backend's updateDraft guard
// (draft is pre-submission, more_info_requested is a reviewer sending it back).
const EDITABLE_STATUSES = new Set(['draft', 'more_info_requested']);

export default function GoodConductApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('services.conduct.apply');

  const editId = searchParams.get('edit');
  const [editRequest, setEditRequest] = useState<GoodConductRequest | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  // Gates the "start a new request" form until we've confirmed there isn't
  // already an active one — starts true only when we're about to check.
  const [checkingExisting, setCheckingExisting] = useState(!editId);

  useEffect(() => {
    if (!editId || !isAuthenticated) return;
    // `editId` can go from absent to present without a remount — e.g. the
    // "redirect to my existing draft" effect below calls router.replace(),
    // which is a client-side soft navigation on the same page instance.
    // loadingEdit's initial useState value was locked in at the FIRST mount
    // (when editId was still null), so it must be re-armed here or the wizard
    // below mounts immediately with a still-null editRequest and locks in
    // empty react-hook-form defaults — the same failure mode fixed earlier,
    // just reached through a different path.
    setLoadingEdit(true);
    goodConductApi
      .getById(editId)
      .then(setEditRequest)
      .catch(() => setEditRequest(null))
      .finally(() => setLoadingEdit(false));
  }, [editId, isAuthenticated]);

  // No `?edit=` in the URL — before showing a blank "new request" form, check
  // whether the applicant already has an active one (the backend would reject
  // a second draft anyway) and redirect them straight to it instead of making
  // them hit that error. Editable statuses go back into the wizard; anything
  // further along (submitted/under_review/approved) goes to status tracking.
  useEffect(() => {
    if (editId || !isAuthenticated) {
      setCheckingExisting(false);
      return;
    }
    let cancelled = false;
    goodConductApi
      .listMine()
      .then((requests) => {
        if (cancelled) return;
        const active = requests.find((r) =>
          ['draft', 'submitted', 'under_review', 'more_info_requested', 'approved'].includes(r.status),
        );
        if (!active) {
          setCheckingExisting(false);
          return;
        }
        if (EDITABLE_STATUSES.has(active.status)) {
          router.replace(`/${locale}/services/good-conduct/apply?edit=${active.id}`);
        } else {
          router.replace(`/${locale}/services/good-conduct/status`);
        }
      })
      .catch(() => setCheckingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [editId, isAuthenticated, locale, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(38vh, 300px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
          alt="Good conduct certificate"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-indigo-950/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-xl shadow-indigo-900/50 ring-1 ring-white/20">
                <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
              {isAuthenticated ? t('heroTitle') : t('requirementsHeroTitle')}
            </h1>
            {!isAuthenticated && (
              <p className="text-white/70 text-base max-w-xl mx-auto mt-3 leading-relaxed">
                {t('requirementsHeroSubtitle')}
              </p>
            )}
          </div>
        </div>

        <HeroBackLink href={`/${locale}/services/conduct`} label={t('backToService')} />
      </section>

      {(isLoading || loadingEdit || checkingExisting) && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {!isLoading && !loadingEdit && !checkingExisting && !isAuthenticated && <RequirementsView locale={locale} />}

      {!isLoading && !loadingEdit && !checkingExisting && isAuthenticated && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {editRequest?.moreInfoRequested && (
            <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
              <strong>{t('moreInfoNoteLabel')}: </strong>
              {editRequest.moreInfoRequested}
            </div>
          )}
          <GoodConductWizard editRequest={editRequest ?? undefined} />
        </main>
      )}

      <Footer />
    </div>
  );
}
