import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { MarriageStatusChecker } from '@/components/services/MarriageStatusChecker';

export default async function MarriageStatusPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('services.marriage.status');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero banner — same image as the landing page ── */}
      <section className="relative h-40 sm:h-52 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
          alt="Islamic marriage celebration"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-rose-950/60 to-black/40" />
        <div className="absolute inset-0 pattern-islamic opacity-20" />

        <div className="relative h-full flex flex-col justify-end pb-6 px-4 max-w-2xl mx-auto w-full">
          <Link
            href={`/${locale}/services/marriage`}
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium mb-3 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Marriage Services
          </Link>
          <p className="text-[10px] font-bold tracking-widest uppercase text-rose-300 mb-1">
            RMC Nikah Service
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {t('title')}
          </h1>
        </div>
      </section>

      {/* ── Content ── */}
      <main className="max-w-2xl mx-auto px-4 py-8 lg:py-10">
        <p className="text-gray-500 text-sm mb-6">{t('subtitle')}</p>

        <Suspense>
          <MarriageStatusChecker />
        </Suspense>

        <p className="mt-8 text-center text-xs text-gray-400">
          Need help?{' '}
          <Link href={`/${locale}/contact`} className="text-rose-500 hover:text-rose-700 font-medium transition-colors">
            Contact RMC
          </Link>
          {' '}— we typically respond within one business day.
        </p>
      </main>

      <Footer />
    </div>
  );
}
