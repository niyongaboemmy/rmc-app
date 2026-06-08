'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const t = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rmc-green flex items-center justify-center">
              <span className="text-white text-xs font-bold">RMC</span>
            </div>
            <span className="font-semibold text-rmc-green hidden sm:block">
              {t('home')} — RMC
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href={`/${locale}/login`} className="text-gray-600 hover:text-rmc-green text-sm font-medium transition-colors">
              {t('login')}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="bg-rmc-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rmc-green-dark transition-colors"
            >
              {t('register')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
