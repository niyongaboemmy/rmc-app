'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Compass } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

/** Clean, minimal 404 — brand colours, no heavy animation. */
export function NotFoundView() {
  const t = useTranslations('notFoundPage');
  const { locale } = useParams<{ locale: string }>();
  const loc = locale ?? 'en';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 pt-36 text-center">
        <div className="mx-auto max-w-md animate-fade-up">
          <p className="text-7xl font-extrabold leading-none tracking-tight text-rmc-green sm:text-8xl">404</p>

          <div className="mx-auto my-6 h-px w-16 bg-gradient-to-r from-transparent via-rmc-gold/70 to-transparent" aria-hidden="true" />

          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 sm:text-[15px]">{t('subtitle')}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/${loc}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/20 transition-all duration-200 hover:scale-105 hover:bg-rmc-green-dark hover:shadow-xl active:scale-100"
            >
              <Home className="h-4 w-4" /> {t('home')}
            </Link>
            <Link
              href={`/${loc}/services`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              <Compass className="h-4 w-4" /> {t('services')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
