'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, RotateCcw } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

/*
 * Runtime-error boundary for the `[locale]` segment.
 *
 * Renders inside `[locale]/layout.tsx`, so the providers (next-intl, auth, …)
 * are still available. Errors thrown by that layout itself are NOT caught here —
 * they fall through to `app/global-error.tsx`.
 *
 * Mirrors `NotFoundView` so both error states look like one family. The raw
 * error message is never shown; only the digest, which matches the server log.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');
  const { locale } = useParams<{ locale: string }>();
  const loc = locale ?? 'en';

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 pt-36 text-center">
        <div className="mx-auto max-w-md animate-fade-up">
          <p className="text-7xl font-extrabold leading-none tracking-tight text-rmc-green sm:text-8xl">500</p>

          <div className="mx-auto my-6 h-px w-16 bg-gradient-to-r from-transparent via-rmc-gold/70 to-transparent" aria-hidden="true" />

          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 sm:text-[15px]">{t('subtitle')}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/20 transition-all duration-200 hover:scale-105 hover:bg-rmc-green-dark hover:shadow-xl active:scale-100"
            >
              <RotateCcw className="h-4 w-4" /> {t('retry')}
            </button>
            <Link
              href={`/${loc}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              <Home className="h-4 w-4" /> {t('home')}
            </Link>
          </div>

          {error.digest && (
            <p className="mt-6 text-xs text-gray-400">
              {t('reference')}: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
