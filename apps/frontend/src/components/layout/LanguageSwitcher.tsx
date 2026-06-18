'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface LocaleOption {
  code: 'en' | 'rw' | 'ar';
  /** Emoji flag (falls back to the short label on platforms without flag glyphs). */
  flag: string;
  /** Short code shown in the compact trigger. */
  label: string;
  /** Language name in its own language. */
  name: string;
  rtl?: boolean;
}

const LOCALES: LocaleOption[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'rw', flag: '🇷🇼', label: 'RW', name: 'Ikinyarwanda' },
  { code: 'ar', flag: '🇸🇦', label: 'AR', name: 'العربية', rtl: true },
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

  /* Close on outside click + Escape */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger — flag + code, so the current language is obvious at a glance */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          scrolled
            ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change language — current: ${current.name}`}
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        <span>{current.label}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — flag + native name + clear selected state */}
      <div
        className={`absolute end-0 mt-2 w-48 rounded-2xl bg-white shadow-xl shadow-black/10 border border-gray-100 overflow-hidden z-50 transition-all duration-200 origin-top ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="listbox"
        aria-label="Select language"
      >
        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
          Language
        </p>
        {LOCALES.map(({ code, flag, name, rtl }) => {
          const selected = currentLocale === code;
          return (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              role="option"
              aria-selected={selected}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                selected
                  ? 'bg-rmc-green-light text-rmc-green-dark font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {flag}
              </span>
              <span dir={rtl ? 'rtl' : 'ltr'} className={rtl ? 'font-arabic' : ''}>
                {name}
              </span>
              {selected && <Check className="ml-auto w-4 h-4 text-rmc-green shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
