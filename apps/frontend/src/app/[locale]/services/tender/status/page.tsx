import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TenderStatusChecker } from '@/components/services/TenderStatusChecker';

/**
 * Server shell (hero + chrome) around a client status tracker. The tracker
 * itself must be a client component — it reads the localStorage-backed auth
 * context — so it's isolated behind Suspense rather than making the whole page
 * client-side.
 */
export default async function TenderStatusPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.tender.status');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(38vh, 300px)' }}
      >
        <Image
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80"
          alt="Tender application status"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
        <div className="absolute inset-0 pattern-islamic opacity-25" />

        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
                <Briefcase className="w-7 h-7 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{t('heroTitle')}</h1>
            <p className="text-white/70 text-base max-w-xl mx-auto mt-3 leading-relaxed">
              {t('heroSubtitle')}
            </p>
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-rmc-green animate-spin" />
            </div>
          }
        >
          <TenderStatusChecker />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
