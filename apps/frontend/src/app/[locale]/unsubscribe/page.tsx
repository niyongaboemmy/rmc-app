'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { publicApi } from '@/lib/public-api';

export default function UnsubscribePage() {
  const { locale } = useParams<{ locale: string }>();
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<'loading' | 'done' | 'invalid'>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    publicApi
      .unsubscribe(token)
      .then((res: { unsubscribed?: boolean } | undefined) => setStatus(res?.unsubscribed ? 'done' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full text-center rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          {status === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-rmc-green mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Processing…</p>
            </>
          )}
          {status === 'done' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-rmc-green mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">You’ve been unsubscribed</h1>
              <p className="text-gray-500 text-sm mb-6">You won’t receive further update emails from RMC. You can resubscribe anytime from our website.</p>
              <Link href={`/${locale}`} className="inline-flex items-center justify-center rounded-full bg-rmc-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-rmc-green-dark transition-colors">
                Back to home
              </Link>
            </>
          )}
          {status === 'invalid' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
              <p className="text-gray-500 text-sm mb-6">This unsubscribe link is not valid. If you keep receiving emails, contact us.</p>
              <Link href={`/${locale}`} className="inline-flex items-center justify-center rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-rmc-green hover:text-rmc-green transition-colors">
                Back to home
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
