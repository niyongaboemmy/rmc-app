'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogIn, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ScholarshipWizard } from '@/components/services/scholarship/ScholarshipWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { scholarshipApi, type ScholarshipApplication } from '@/lib/scholarshipApi';

function RequirementsView({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.scholarship.apply');

  return (
    <main className="bg-gray-50/60 pattern-light py-8 lg:py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <button
          onClick={() => router.push(`/${locale}/login?redirect=/services/scholarship/apply`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-violet-500/20"
        >
          <LogIn className="w-4 h-4" /> {t('signInToApply')}
        </button>
        <p className="text-xs text-gray-400">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-violet-600 hover:underline font-medium">
            {t('requestAccess')}
          </Link>
        </p>
      </div>
    </main>
  );
}

// Statuses the wizard can still edit — a draft hasn't been submitted yet.
const EDITABLE_STATUSES = new Set(['draft']);
// Statuses that count as "already has an active application" — rejected/cancelled
// applicants are free to start a new one.
const ACTIVE_STATUSES = new Set(['draft', 'submitted', 'under_review', 'approved']);

export default function ScholarshipApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('services.scholarship.apply');

  const editId = searchParams.get('edit');
  const programId = searchParams.get('program') ?? undefined;
  const [editRequest, setEditRequest] = useState<ScholarshipApplication | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [checkingExisting, setCheckingExisting] = useState(!editId);

  useEffect(() => {
    if (!editId || !isAuthenticated) return;
    setLoadingEdit(true);
    scholarshipApi
      .getById(editId)
      .then(setEditRequest)
      .catch(() => setEditRequest(null))
      .finally(() => setLoadingEdit(false));
  }, [editId, isAuthenticated]);

  // No `?edit=` in the URL — before showing a blank "new application" form, check
  // whether the applicant already has an active one and redirect them straight to
  // it instead. Draft applications go back into the wizard; anything further along
  // goes to public status tracking (by application number, since that page doesn't
  // list "my applications").
  useEffect(() => {
    if (editId || !isAuthenticated) {
      setCheckingExisting(false);
      return;
    }
    let cancelled = false;
    scholarshipApi
      .listMine()
      .then((applications) => {
        if (cancelled) return;
        const active = applications.find((a) => ACTIVE_STATUSES.has(a.status));
        if (!active) {
          setCheckingExisting(false);
          return;
        }
        if (EDITABLE_STATUSES.has(active.status)) {
          router.replace(`/${locale}/services/scholarship/apply?edit=${active.id}`);
        } else {
          router.replace(`/${locale}/services/scholarship/status?id=${active.applicationNumber}`);
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
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80"
          alt="Scholarship application"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-violet-950/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-xl shadow-violet-900/50 ring-1 ring-white/20">
                <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.25} />
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

        <div className="relative px-4 sm:px-6 lg:px-8 pb-5 pt-2 flex justify-center sm:justify-start">
          <Link
            href={`/${locale}/services/scholarship`}
            className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToService')}
          </Link>
        </div>
      </section>

      {(isLoading || loadingEdit || checkingExisting) && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {/* TODO(restore auth gate): sign-in requirement temporarily bypassed for local
          testing while the backend is being built. Restore the `!isAuthenticated` /
          `isAuthenticated` split below (see git history) before this ships. */}
      {!isLoading && !loadingEdit && !checkingExisting && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <ScholarshipWizard editRequest={editRequest ?? undefined} initialProgramId={programId} />
        </main>
      )}

      <Footer />
    </div>
  );
}
