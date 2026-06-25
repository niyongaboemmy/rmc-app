'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/public-api';

/**
 * Compact email subscribe form for light cards (events sections, etc.).
 * Wires to the public single-opt-in subscribe API; reuses the footer's
 * newsletter i18n keys for the placeholder / button / success copy.
 */
export function InlineSubscribe({ source, className = '' }: { source?: string; className?: string }) {
  const t = useTranslations('footer');
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      await publicApi.subscribe(email.trim(), locale, source);
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <span className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-rmc-green-light px-4 py-2.5 text-xs font-semibold text-rmc-green-dark ring-1 ring-rmc-green/20 ${className}`}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rmc-green text-white">
          <Check className="h-3 w-3" />
        </span>
        {t('newsletterSuccess')}
      </span>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`group flex w-full shrink-0 items-center gap-1 rounded-full border border-rmc-green/20 bg-white py-1 pl-4 pr-1 shadow-sm transition-all duration-300 focus-within:border-rmc-green/50 focus-within:shadow-md focus-within:shadow-rmc-green/10 focus-within:ring-2 focus-within:ring-rmc-green/20 sm:w-auto ${className}`}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
        placeholder={t('newsletterPlaceholder')}
        aria-label={t('newsletterPlaceholder')}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-900 placeholder-gray-400 outline-none sm:w-44"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rmc-green px-4 py-2 text-xs font-bold text-white transition-all duration-300 hover:bg-rmc-green-dark disabled:opacity-60"
      >
        {status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
        <span className={status === 'error' ? 'hidden' : ''}>{t('newsletterButton')}</span>
      </button>
    </form>
  );
}
