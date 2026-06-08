'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';

const LOCALES = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'rw', label: 'RW', flag: '🇷🇼' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale: currentLocale } = useParams<{ locale: string }>();

  const switchLocale = (newLocale: string) => {
    // Replace the current locale prefix with the new one
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {LOCALES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
            currentLocale === code
              ? 'bg-white shadow text-rmc-green'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          title={label}
          aria-label={`Switch to ${label}`}
        >
          <span aria-hidden="true">{flag}</span>{' '}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
