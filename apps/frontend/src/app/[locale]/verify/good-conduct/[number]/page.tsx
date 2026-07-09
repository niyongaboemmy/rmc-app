'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShieldCheck, ShieldX, Loader2, Building2, User, Calendar, FileText } from 'lucide-react';
import { goodConductPublicApi, type PublicVerification } from '@/lib/goodConductApi';

export default function GoodConductVerifyPage() {
  const t = useTranslations('services.conduct.verify');
  const motifT = useTranslations('services.conduct.status.motif');
  const { locale, number } = useParams<{ locale: string; number: string }>();
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    goodConductPublicApi
      .verify(number)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            {t('brandLink')}
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500">{t('verifying')}</p>
          </div>
        )}

        {!loading && !result && (
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <ShieldX className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">{t('notFoundTitle')}</h1>
            <p className="text-sm text-gray-500">
              {t('notFoundTextPrefix')} <span className="font-mono">{number}</span>. {t('notFoundTextSuffix')}
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2" />
              <p className="font-bold text-lg">{t('validTitle')}</p>
              <p className="text-white/80 text-xs font-mono mt-1">{result.certificateNumber}</p>
            </div>
            <div className="p-6 space-y-4">
              <Row icon={<User className="w-4 h-4" />} label={t('fullName')} value={result.fullName} />
              {result.mosqueName && (
                <Row icon={<Building2 className="w-4 h-4" />} label={t('mosque')} value={result.mosqueName} />
              )}
              {result.imamName && <Row icon={<User className="w-4 h-4" />} label={t('imam')} value={result.imamName} />}
              <Row
                icon={<FileText className="w-4 h-4" />}
                label={t('reason')}
                value={motifT(result.motif)}
              />
              {result.issuedAt && (
                <Row
                  icon={<Calendar className="w-4 h-4" />}
                  label={t('issuedOn')}
                  value={new Date(result.issuedAt).toLocaleDateString(locale, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
