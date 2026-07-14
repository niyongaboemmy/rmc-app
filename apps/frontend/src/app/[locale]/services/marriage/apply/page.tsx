'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  LogIn,
  FileText,
  User,
  Users,
  Heart,
  CreditCard,
  Clock,
  CheckCircle2,
  Camera,
  Landmark,
} from 'lucide-react';
import { HeroBackLink } from '@/components/services/HeroBackLink';
import { MarriageWizard } from '@/components/services/marriage/MarriageWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useTranslations } from 'next-intl';

// ─── Public info view ─────────────────────────────────────────────────────────

function RequirementsView({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.marriage.apply');

  const requiredDocs = [
    { icon: User, key: 'd1' },
    { icon: User, key: 'd2' },
    { icon: FileText, key: 'd3' },
    { icon: Camera, key: 'd4' },
  ] as const;

  const processSteps = [
    { icon: FileText, key: 'p1' },
    { icon: Clock, key: 'p2' },
    { icon: CheckCircle2, key: 'p3' },
    { icon: Landmark, key: 'p4' },
    { icon: Heart, key: 'p5' },
  ] as const;

  const fees = [
    { venueKey: 'venueMosqueTitle', amount: t('feeMosque') },
    { venueKey: 'venueOutsideTitle', amount: t('feeOutside') },
  ] as const;

  const witnessReqKeys = ['w1', 'w2', 'w3', 'w4'] as const;

  return (
    <main className="bg-gray-50/60 pattern-light py-8 lg:py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Sign-in prompt */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
          <button
            onClick={() => router.push(`/${locale}/login?redirect=/services/marriage/apply`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors shadow-sm shadow-rose-500/20"
          >
            <LogIn className="w-4 h-4" /> {t('signInToApply')}
          </button>
        </div>

        {/* Required documents */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-500" />
            {t('docsTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requiredDocs.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm"
              >
                <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-rose-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t(`docs.${key}.label`)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t(`docs.${key}.detail`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Application process */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-500" />
            {t('processTitle')}
          </h2>
          <div className="relative flex flex-col gap-0">
            {processSteps.map(({ icon: Icon, key }, i) => (
              <div key={key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shrink-0 z-10">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {i < processSteps.length - 1 && <div className="w-0.5 flex-1 bg-rose-100 my-1" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-semibold text-gray-800">{t(`process.${key}.label`)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t(`process.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fees */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            {t('fees.title')}
          </h2>
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            {fees.map(({ venueKey, amount }, i) => (
              <div
                key={venueKey}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < fees.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-gray-700">{t(venueKey)}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">{amount}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">{t('feesPaymentNote')}</p>
            </div>
          </div>
        </section>

        {/* Witness requirements */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            {t('witnessTitle')}
          </h2>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-5 py-4 space-y-2.5">
            {witnessReqKeys.map((key) => (
              <div key={key} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{t(`witnessReqs.${key}`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pb-2">
          <button
            onClick={() => router.push(`/${locale}/login?redirect=/services/marriage/apply`)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-rose-500/20"
          >
            <LogIn className="w-4 h-4" /> {t('signInToSubmit')}
          </button>
          <p className="text-xs text-gray-400 mt-3">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/register`}
              className="text-rose-600 hover:underline font-medium"
            >
              {t('requestAccess')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarriageApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('services.marriage.apply');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero banner */}
      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(42vh, 320px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
          alt="Islamic marriage celebration"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rose-950/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        {/* Centered hero content */}
        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-xl shadow-rose-900/50 ring-1 ring-white/20">
                <Heart className="w-7 h-7 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-rose-300 mb-2">
              {t('applyHeroBadge')}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
              {isAuthenticated ? t('applyHeroTitle') : t('requirementsHeroTitle')}
            </h1>
            {!isAuthenticated && (
              <p className="text-white/70 text-base max-w-xl mx-auto mt-3 leading-relaxed">
                {t('requirementsHeroSubtitle')}
              </p>
            )}
          </div>
        </div>

        {/* Back button — bottom of hero, always visible */}
        <HeroBackLink href={`/${locale}/services/marriage`} label={t('backToMarriage')} />
      </section>

      {/* Loading skeleton */}
      {isLoading && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {/* Public: requirements view */}
      {!isLoading && !isAuthenticated && <RequirementsView locale={locale} />}

      {/* Authenticated: full wizard */}
      {!isLoading && isAuthenticated && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <p className="text-gray-500 text-sm mb-6">{t('draftNote')}</p>
          <MarriageWizard />
        </main>
      )}

      <Footer />
    </div>
  );
}
