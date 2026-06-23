'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { publicApi } from '@/lib/public-api';
import { useTranslations } from 'next-intl';

type I18n = { en: string; rw: string; ar: string };

type Tender = {
  id: string;
  title: string;
  content: string;
  titleI18n:   I18n | null;
  contentI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
};

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

function getDiffDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function deadlineColor(expiresAt: string | null): string {
  const diff = getDiffDays(expiresAt);
  if (diff === null) return 'text-rmc-green';
  if (diff < 0) return 'text-gray-400';
  if (diff <= 3) return 'text-red-500';
  if (diff <= 7) return 'text-amber-500';
  return 'text-rmc-green';
}

export function TendersSection() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('tenders');
  const { ref, visible } = useScrollReveal(0.1);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  function deadlineLabel(expiresAt: string | null): string {
    const diff = getDiffDays(expiresAt);
    if (diff === null) return t('filters.open');
    if (diff < 0)  return t('deadline.closed');
    if (diff === 0) return t('deadline.today');
    if (diff === 1) return t('deadline.tomorrow');
    return t('deadline.inDays', { days: diff });
  }

  useEffect(() => {
    let active = true;
    publicApi
      .getAnnouncements('tender', 3)
      .then((data) => {
        if (active) setTenders(data);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (!loading && tenders.length === 0) return null;

  return (
    <section className="py-14 bg-gradient-to-b from-rmc-green-deep/3 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`flex items-center justify-between mb-8 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rmc-gold/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-rmc-gold" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900">
                {t('title')}
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/tenders`}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
          >
            {t('card.view')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenders.map((tender, i) => {
              const isRtl = locale === 'ar';
              const displayTitle   = resolveText(tender.titleI18n,   tender.title,   locale);
              const displayContent = resolveText(tender.contentI18n, tender.content, locale);
              return (
              <Link
                key={tender.id}
                href={`/${locale}/tenders/${tender.id}`}
                className={`flex flex-col p-5 rounded-2xl border border-rmc-gold/20 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-500 group ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rmc-gold/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-rmc-gold" />
                  </div>
                  <h3
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className={`font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-rmc-green transition-colors ${isRtl ? 'font-arabic' : ''}`}
                  >
                    {displayTitle}
                  </h3>
                </div>
                <p
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className={`text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4 ${isRtl ? 'font-arabic' : ''}`}
                >
                  {displayContent}
                </p>
                <div className="mt-auto flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 shrink-0 ${deadlineColor(tender.expiresAt)}`} />
                  <span className={`text-xs font-medium ${deadlineColor(tender.expiresAt)}`}>
                    {deadlineLabel(tender.expiresAt)}
                  </span>
                  {tender.expiresAt && (
                    <span className="text-xs text-gray-300 ml-auto">
                      {new Date(tender.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-rmc-green ml-auto transition-colors" />
                </div>
              </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex sm:hidden">
          <Link
            href={`/${locale}/tenders`}
            className="flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
          >
            {t('empty.viewAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
