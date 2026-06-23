'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Clock, ArrowRight, AlertCircle, Paperclip } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
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
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;
};

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

type Filter = 'all' | 'open' | 'closing' | 'closed';

function getDiffDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function getStatus(expiresAt: string | null): 'open' | 'closing' | 'closed' {
  const diff = getDiffDays(expiresAt);
  if (diff === null) return 'open';
  if (diff < 0) return 'closed';
  if (diff <= 7) return 'closing';
  return 'open';
}

function deadlineLabel(
  expiresAt: string | null,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  const diff = getDiffDays(expiresAt);
  if (diff === null) return t('deadline.none');
  if (diff < 0)  return t('deadline.closed');
  if (diff === 0) return t('deadline.today');
  if (diff === 1) return t('deadline.tomorrow');
  return t('deadline.inDays', { days: diff });
}

const STATUS_STYLES = {
  open:    { bar: 'bg-rmc-green',    badge: 'bg-rmc-green/10 text-rmc-green border-rmc-green/20',    icon: 'text-rmc-green' },
  closing: { bar: 'bg-amber-500',    badge: 'bg-amber-50 text-amber-600 border-amber-200',            icon: 'text-amber-500' },
  closed:  { bar: 'bg-gray-300',     badge: 'bg-gray-100 text-gray-400 border-gray-200',              icon: 'text-gray-400' },
};

const FILTER_KEYS: Filter[] = ['all', 'open', 'closing', 'closed'];

export default function TendersPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('tenders');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    publicApi
      .getAnnouncements('tender', 50, true)
      .then(setTenders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return tenders;
    return tenders.filter((tender) => getStatus(tender.expiresAt) === filter);
  }, [tenders, filter]);

  const counts = useMemo(() => ({
    all:     tenders.length,
    open:    tenders.filter((tender) => getStatus(tender.expiresAt) === 'open').length,
    closing: tenders.filter((tender) => getStatus(tender.expiresAt) === 'closing').length,
    closed:  tenders.filter((tender) => getStatus(tender.expiresAt) === 'closed').length,
  }), [tenders]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageHero
          eyebrow={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
          ornament
          minHeightClassName="min-h-[38vh]"
          paddingClassName="pt-36 pb-10"
        />

        <section className="py-14 bg-gray-50 pattern-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Back link */}
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-rmc-green transition-colors mb-8"
            >
              ← {t('backToHome')}
            </Link>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {FILTER_KEYS.map((key) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                      active
                        ? 'bg-rmc-green text-white border-rmc-green shadow-sm shadow-rmc-green/20'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-rmc-green/40 hover:text-rmc-green'
                    }`}
                  >
                    {t(`filters.${key}`)}
                    {!loading && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {counts[key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading skeletons */}
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-52 rounded-2xl bg-gray-200 animate-pulse" />
                ))}
              </div>

            /* Empty state */
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
                  <AlertCircle className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-400">{t('empty.title')}</p>
                <p className="text-sm text-gray-300 mt-1">
                  {filter === 'all' ? t('empty.allSubtitle') : t(`filters.${filter}`)}
                </p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
                  >
                    {t('empty.viewAll')} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            /* Tender cards grid */
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((tender, i) => {
                  const status = getStatus(tender.expiresAt);
                  const styles = STATUS_STYLES[status];
                  const diff = getDiffDays(tender.expiresAt);
                  const attachCount = tender.attachments?.length ?? 0;
                  const isRtl = locale === 'ar';
                  const displayTitle   = resolveText(tender.titleI18n,   tender.title,   locale);
                  const displayContent = resolveText(tender.contentI18n, tender.content, locale);

                  return (
                    <Link
                      key={tender.id}
                      href={`/${locale}/tenders/${tender.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60"
                    >
                      {/* Sliding top-accent bar */}
                      <span
                        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 rounded-t-2xl transition-transform duration-500 ease-out group-hover:scale-x-100 ${styles.bar}`}
                      />

                      {/* Header row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rmc-gold/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-rmc-gold" />
                        </div>
                        <div className="flex items-center gap-2">
                          {attachCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Paperclip className="w-2.5 h-2.5" />
                              {attachCount}
                            </span>
                          )}
                          <span className="font-mono text-[11px] tracking-widest text-gray-200 group-hover:text-gray-300 transition-colors">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2
                        dir={isRtl ? 'rtl' : 'ltr'}
                        className={`font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-rmc-green transition-colors duration-300 ${isRtl ? 'font-arabic' : ''}`}
                      >
                        {displayTitle}
                      </h2>

                      {/* Content */}
                      <p
                        dir={isRtl ? 'rtl' : 'ltr'}
                        className={`text-gray-400 text-xs leading-relaxed line-clamp-3 flex-1 mb-4 ${isRtl ? 'font-arabic' : ''}`}
                      >
                        {displayContent}
                      </p>

                      {/* Footer row */}
                      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${styles.badge}`}>
                          <Clock className={`w-3 h-3 ${styles.icon}`} />
                          {deadlineLabel(tender.expiresAt, (key, values) => t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]))}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-300 group-hover:text-rmc-green transition-colors flex items-center gap-0.5">
                          {t('card.view')} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>

                      {/* Urgency progress bar for closing-soon tenders */}
                      {status === 'closing' && diff !== null && diff >= 0 && (
                        <div className="mt-3 h-1 rounded-full bg-amber-100 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${Math.max(5, 100 - (diff / 7) * 100)}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
