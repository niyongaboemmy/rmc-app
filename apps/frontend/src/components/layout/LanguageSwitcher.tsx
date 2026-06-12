'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const LOCALES = [
  { code: 'en', label: 'EN', flag: 'EN' },
  { code: 'rw', label: 'RW', flag: 'RW' },
  { code: 'ar', label: 'AR', flag: 'AR' },
];

export function LanguageSwitcher({ scrolled = false }: { scrolled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale: currentLocale } = useParams<{ locale: string }>();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0];

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setOpen(false);
  };

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium transition-all duration-200 ${
          scrolled
            ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 mt-2 w-28 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50 transition-all duration-200 origin-top-right ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="listbox"
      >
        {LOCALES.map(({ code, label, flag }) => (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            role="option"
            aria-selected={currentLocale === code}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors duration-150 ${
              currentLocale === code
                ? 'bg-rmc-green-light text-rmc-green font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{flag}</span>
            <span>{label}</span>
            {currentLocale === code && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rmc-green" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
