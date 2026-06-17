import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Search } from 'lucide-react';
import { MarriageStatusChecker } from '@/components/services/MarriageStatusChecker';

export default async function MarriageStatusPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.marriage.status');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="bg-gray-50/60 pattern-light">
        <div className="max-w-3xl mx-auto px-4 py-10 lg:py-16">
          <Link
            href={`/${locale}/services/marriage`}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-rose-700 text-sm font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('backToService')}
          </Link>

          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shadow-lg shadow-rose-900/30 ring-1 ring-white/20">
              <Search className="w-7 h-7 text-white" strokeWidth={2.25} />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{t('title')}</h1>
            <p className="text-gray-500 max-w-xl mx-auto">{t('subtitle')}</p>
          </div>

          <Suspense>
            <MarriageStatusChecker />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
