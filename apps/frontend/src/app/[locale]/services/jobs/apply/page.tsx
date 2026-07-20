'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, LogIn, Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { JobApplicationForm } from '@/components/services/jobs/JobApplicationForm';

function SignInView({ locale }: { locale: string }) {
  const router = useRouter();
  const t = useTranslations('services.jobs.apply');

  return (
    <main className="bg-gray-50/60 pattern-light py-10 lg:py-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
        <p className="text-sm text-gray-500">{t('signInPrompt')}</p>
        <button
          onClick={() => router.push(`/${locale}/login?redirect=/services/jobs/apply`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20"
        >
          <LogIn className="w-4 h-4" /> {t('signInToApply')}
        </button>
        <p className="text-xs text-gray-400">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-emerald-600 hover:underline font-medium">
            {t('requestAccess')}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function JobsApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('services.jobs.apply');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(38vh, 300px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
          alt="Job application"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-emerald-950/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-xl shadow-emerald-900/50 ring-1 ring-white/20">
                <Briefcase className="w-7 h-7 text-white" strokeWidth={2.25} />
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
            href={`/${locale}/services/jobs`}
            className="inline-flex items-center gap-2 text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/25 hover:border-white/50 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToService')}
          </Link>
        </div>
      </section>

      {isLoading && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {!isLoading && !isAuthenticated && <SignInView locale={locale} />}

      {!isLoading && isAuthenticated && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <JobApplicationForm />
        </main>
      )}

      <Footer />
    </div>
  );
}
