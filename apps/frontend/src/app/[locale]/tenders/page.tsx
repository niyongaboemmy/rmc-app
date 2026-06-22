'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Clock, ChevronLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { publicApi } from '@/lib/public-api';

type Tender = {
  id: string;
  title: string;
  content: string;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
};

function deadlineLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'Open';
  const diffDays = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) return 'Closed';
  if (diffDays === 0) return 'Closes today';
  if (diffDays === 1) return 'Closes tomorrow';
  return `Closes in ${diffDays} days`;
}

function deadlineColor(expiresAt: string | null): string {
  if (!expiresAt) return 'text-rmc-green';
  const diffDays = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) return 'text-gray-400';
  if (diffDays <= 3) return 'text-red-500';
  if (diffDays <= 7) return 'text-amber-500';
  return 'text-rmc-green';
}

export default function TendersPage() {
  const { locale } = useParams<{ locale: string }>();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi
      .getAnnouncements('tender', 50)
      .then(setTenders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="mb-8">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-rmc-green transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rmc-gold/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-rmc-gold" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Open Tenders</h1>
              <p className="text-gray-400 text-sm mt-0.5">Business opportunities published by Rwanda Muslim Community</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-24 text-gray-300">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No open tenders at this time</p>
            <p className="text-sm mt-1">Check back later for new opportunities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenders.map((tender) => (
              <div
                key={tender.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 text-base leading-snug mb-2">
                      {tender.title}
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed">{tender.content}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${deadlineColor(tender.expiresAt)}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {deadlineLabel(tender.expiresAt)}
                    </div>
                    {tender.expiresAt && (
                      <p className="text-xs text-gray-300 mt-1">
                        {new Date(tender.expiresAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
