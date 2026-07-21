'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { publicApi } from '@/lib/public-api';

/**
 * One-click unsubscribe, reached from the footer link in every email.
 *
 * The opt-out is deliberately NOT fired on mount: mail-security scanners and
 * link prefetchers follow every URL in an email, and an unsubscribe that runs on
 * page load would silently drop those readers off the list without them ever
 * clicking. A bot renders the page; only a human presses the button.
 */
export default function UnsubscribePage() {
  const { locale } = useParams<{ locale: string }>();
  const token = useSearchParams().get('token');

  // 'confirm' → waiting on the reader; 'invalid' covers a missing/unknown token.
  const [status, setStatus] = useState<'confirm' | 'working' | 'done' | 'invalid'>(
    token ? 'confirm' : 'invalid',
  );

  const confirm = async () => {
    if (!token) return;
    setStatus('working');
    try {
      const res: { unsubscribed?: boolean } | undefined = await publicApi.unsubscribe(token);
      setStatus(res?.unsubscribed ? 'done' : 'invalid');
    } catch {
      setStatus('invalid');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full text-center rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          {(status === 'confirm' || status === 'working') && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribe from RMC updates?</h1>
              <p className="text-gray-500 text-sm mb-6">
                You’ll stop receiving announcements, programs and news from the Rwanda Muslim
                Community. You can resubscribe anytime from our website.
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={status === 'working'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
              >
                {status === 'working' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {status === 'working' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
              </button>
              <div className="mt-4">
                <Link href={`/${locale}`} className="text-sm font-semibold text-gray-500 hover:text-rmc-green transition-colors">
                  No, keep me subscribed
                </Link>
              </div>
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
              <h1 className="text-xl font-bold text-gray-900 mb-2">This unsubscribe link isn’t valid</h1>
              <p className="text-gray-500 text-sm mb-6">
                The link may have been copied incompletely. Open it again straight from the email —
                and if you keep receiving messages, contact us and we’ll remove you.
              </p>
              <Link href={`/${locale}`} className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-rmc-green hover:text-rmc-green transition-colors">
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
