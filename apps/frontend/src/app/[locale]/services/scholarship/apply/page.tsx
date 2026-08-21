'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogIn, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ScholarshipWizard } from '@/components/services/scholarship/ScholarshipWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  scholarshipApi,
  scholarshipPublicApi,
  type ScholarshipApplication,
  type ScholarshipProgram,
} from '@/lib/scholarshipApi';

function RequirementsView({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.scholarship.apply');

  return (
    <main className="bg-gray-50/60 pattern-light py-8 lg:py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <button
          onClick={() => router.push(`/${locale}/login?redirect=/services/scholarship/apply`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-rmc-green hover:bg-rmc-green-dark text-white font-semibold text-sm transition-colors shadow-lg shadow-rmc-green/20"
        >
          <LogIn className="w-4 h-4" /> {t('signInToApply')}
        </button>
        <p className="text-xs text-gray-400">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-rmc-green hover:underline font-medium">
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
  const [program, setProgram] = useState<ScholarshipProgram | null>(null);

  /**
   * An application must target a scholarship. Reaching /apply with no `?program=`
   * and no `?edit=` means there is nothing to apply to, so send them to the list
   * rather than render a form whose submit the backend would reject.
   */
  useEffect(() => {
    if (!programId && !editId) {
      router.replace(`/${locale}/services/scholarship`);
    }
  }, [programId, editId, locale, router]);

  // Load the scholarship so the wizard can name it. An edit carries its own.
  useEffect(() => {
    const id = programId ?? editRequest?.programId ?? undefined;
    if (!id) return;
    let cancelled = false;
    scholarshipPublicApi
      .getProgram(id)
      .then((p) => !cancelled && setProgram(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [programId, editRequest]);

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
          // No `?id=` — tracking is gated on a tracking code plus an SMS OTP
          // (migration 051), so an application NUMBER in the URL prefills
          // nothing and is the wrong identifier to hand anyone.
          router.replace(`/${locale}/services/scholarship/status`);
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

      {/* No hero. This is a form, not a landing page: a 300px photograph pushes
          the first field below the fold and says nothing the applicant needs.
          The title and the way back are kept — they are navigation, not
          decoration. */}
      <header className="border-b border-gray-200 bg-white pt-24 md:pt-28">
        <div className="mx-auto max-w-2xl px-4 pb-5 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}/services/scholarship`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('backToService')}
          </Link>
          <h1 className="mt-2 flex items-center gap-2.5 text-xl font-bold text-gray-900 md:text-2xl">
            <GraduationCap className="h-6 w-6 shrink-0 text-rmc-green" strokeWidth={2.25} />
            {isAuthenticated ? t('heroTitle') : t('requirementsHeroTitle')}
          </h1>
          {!isAuthenticated && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              {t('requirementsHeroSubtitle')}
            </p>
          )}
        </div>
      </header>

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
          {/* Which scholarship this application is for. Stated plainly and not
              editable — the applicant chose it by opening it, and a picker here
              would let them file the form against a different one. */}
          {program && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-rmc-green" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {t('applyingFor')}
                </p>
                <p className="truncate text-sm font-bold text-gray-900">{program.title}</p>
                {program.deadline && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t('deadlineOn', {
                      date: new Date(program.deadline).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }),
                    })}
                  </p>
                )}
                <Link
                  href={`/${locale}/services/scholarship/${program.slug ?? program.id}`}
                  className="mt-1 inline-block text-xs font-semibold text-rmc-green hover:underline"
                >
                  {t('viewScholarship')}
                </Link>
              </div>
            </div>
          )}
          {/* The scholarship's own document list drives the upload step, so the
              form asks for exactly what its detail page said to bring. */}
          <ScholarshipWizard
            editRequest={editRequest ?? undefined}
            initialProgramId={programId}
            requiredDocuments={program?.requiredDocuments}
          />
        </main>
      )}

      <Footer />
    </div>
  );
}
