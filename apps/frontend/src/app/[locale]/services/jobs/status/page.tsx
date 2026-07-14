'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { JobsStatusChecker } from '@/components/services/jobs/JobsStatusChecker';
import { JobsTrackByNumber } from '@/components/services/jobs/JobsTrackByNumber';

export default function JobsStatusPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.jobs.status');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(34vh, 260px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
          alt="Application status"
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
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{t('heroTitle')}</h1>
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
        <JobsTrackByNumber />
        <JobsStatusChecker />
      </main>

      <Footer />
    </div>
  );
}
