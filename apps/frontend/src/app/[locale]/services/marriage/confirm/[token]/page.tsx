'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const ROLE_LABELS: Record<string, string> = {
  bride: 'Bride (Umugeni)',
  groom: 'Groom (Umugabo)',
  wali: "Bride's Guardian (Wali)",
  imam: 'Officiating Imam',
};

type LookupResult = {
  confirmation: {
    id: string;
    role: string;
    name: string | null;
    confirmedAt: string | null;
  };
  application: {
    applicationNumber: string;
    groomName: string;
    brideName: string;
    ceremonyDate: string | null;
    status: string;
  };
};

type PageState = 'loading' | 'ready' | 'confirming' | 'done' | 'already_done' | 'error';

export default function MarriageConfirmPage() {
  const { locale, token } = useParams<{ locale: string; token: string }>();
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/marriage/confirm/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Invalid or expired link');
        return r.json();
      })
      .then((json) => {
        const data = json?.data ?? json;
        setLookup(data);
        setState(data.confirmation.confirmedAt ? 'already_done' : 'ready');
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Invalid or expired confirmation link.');
        setState('error');
      });
  }, [token]);

  const handleConfirm = async () => {
    setState('confirming');
    try {
      const res = await fetch(`${API_BASE}/marriage/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Confirmation failed');
      }
      setState('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 pt-32 pb-20">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-rmc-green/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-rmc-green" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nikah Confirmation</h1>
            <p className="text-gray-400 text-sm mt-1">Rwanda Muslim Community</p>
          </div>

          {state === 'loading' && (
            <div className="space-y-3">
              <div className="h-6 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse mt-6" />
            </div>
          )}

          {(state === 'ready' || state === 'confirming') && lookup && (
            <>
              <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rmc-gold mb-3">
                  Application Details
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reference</span>
                  <span className="font-semibold text-gray-900">{lookup.application.applicationNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Groom</span>
                  <span className="text-gray-700">{lookup.application.groomName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bride</span>
                  <span className="text-gray-700">{lookup.application.brideName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Your Role</span>
                  <span className="font-semibold text-rmc-green">
                    {ROLE_LABELS[lookup.confirmation.role] ?? lookup.confirmation.role}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                By confirming, you acknowledge your role in this Nikah application and agree to participate in the marriage ceremony as listed above.
              </p>

              <button
                onClick={handleConfirm}
                disabled={state === 'confirming'}
                className="w-full py-4 bg-rmc-green text-white font-semibold rounded-2xl shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === 'confirming' ? 'Submitting…' : 'I Confirm My Participation'}
              </button>
            </>
          )}

          {state === 'done' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-rmc-green mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmation Received</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                JazakAllah Khayran! Your confirmation has been recorded. The applicant and RMC team have been notified.
              </p>
            </div>
          )}

          {state === 'already_done' && (
            <div className="text-center">
              <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Already Confirmed</h2>
              <p className="text-gray-500 text-sm">
                You have already confirmed your participation in this Nikah application. No further action is needed.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {errorMsg || 'This confirmation link is invalid or has already been used.'}
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <Link href={`/${locale}`} className="text-xs text-gray-300 hover:text-rmc-green transition-colors">
              Rwanda Muslim Community · rmc.org.rw
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
