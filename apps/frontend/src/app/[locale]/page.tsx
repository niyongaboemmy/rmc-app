'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

export default function HomePage() {
  const t = useTranslations();
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rmc-green-light to-white">
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Logo placeholder */}
          <div className="w-24 h-24 rounded-full bg-rmc-green flex items-center justify-center mx-auto mb-8 shadow-lg">
            <span className="text-white text-4xl font-bold">RMC</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-rmc-green mb-4 leading-tight">
            {t('home.hero.title')}
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>

          <div className="inline-flex items-center gap-2 bg-rmc-gold text-white px-6 py-3 rounded-full font-semibold text-sm shadow-md mb-10">
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
            {t('home.hero.comingSoon')}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/login`}
              className="px-8 py-3 bg-rmc-green text-white rounded-lg font-semibold hover:bg-rmc-green-dark transition-colors shadow-md"
            >
              {t('nav.login')}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="px-8 py-3 border-2 border-rmc-green text-rmc-green rounded-lg font-semibold hover:bg-rmc-green-light transition-colors"
            >
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
