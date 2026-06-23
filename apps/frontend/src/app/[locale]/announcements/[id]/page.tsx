'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bell, Paperclip, Download,
  Eye, ExternalLink, AlertCircle, Calendar, Flag,
  FileText,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { publicApi } from '@/lib/public-api';
import { fileUrl } from '@/lib/api';
import { useTranslations } from 'next-intl';

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { key: string; name: string; mimeType: string; size: number };

type I18n = { en: string; rw: string; ar: string };

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  titleI18n:   I18n | null;
  contentI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
  attachments: Attachment[];
};

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(mimeType: string) { return mimeType === 'application/pdf'; }
function isImage(mimeType: string) { return mimeType.startsWith('image/'); }

const PRIORITY_COLOR: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnnouncementDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const t = useTranslations('announcements');
  const [item, setItem] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);

  useEffect(() => {
    publicApi.getAnnouncement(id)
      .then((data) => setItem(data as AnnouncementItem))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const priorityColor = item ? (PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.normal) : null;
  const priorityLabel = item
    ? t(`priority.${item.priority as 'normal' | 'high' | 'urgent'}`)
    : '';

  const isRtl = locale === 'ar';
  const displayTitle   = item ? resolveText(item.titleI18n,   item.title,   locale) : '';
  const displayContent = item ? resolveText(item.contentI18n, item.content, locale) : '';

  const heroTitle = loading
    ? t('detail.heroTitle')
    : notFound
    ? t('detail.notFoundHeroTitle')
    : displayTitle;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>

        {/* Hero */}
        <PageHero
          eyebrow={t('eyebrow')}
          title={heroTitle}
          titleClassName="text-2xl md:text-3xl lg:text-4xl"
          align="left"
          backHref={`/${locale}/announcements`}
          backLabel={t('detail.backLabel')}
          minHeightClassName="min-h-[42vh]"
          paddingClassName="pt-28 pb-10"
          ornament={false}
        >
          {item && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {item.priority !== 'normal' && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm bg-white/10 border-white/20 text-white uppercase tracking-wide ${priorityColor}`}>
                  <Flag className="w-3 h-3" />
                  {priorityLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60 backdrop-blur-sm">
                <Calendar className="w-3 h-3" />
                {t('detail.published')}{' '}
                {formatDate(item.publishAt)}
              </span>
              {item.expiresAt && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60 backdrop-blur-sm">
                  <Calendar className="w-3 h-3" />
                  {t('detail.expiresLabel')}{' '}
                  <span className="font-semibold">{formatDate(item.expiresAt)}</span>
                </span>
              )}
            </div>
          )}
        </PageHero>

        {/* Body */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50 pattern-light">
          <div className="max-w-4xl mx-auto">

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-5 animate-pulse">
                <div className="h-48 rounded-2xl bg-gray-200" />
                <div className="h-32 rounded-2xl bg-gray-200" />
              </div>
            )}

            {/* Not found */}
            {!loading && notFound && (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-lg font-semibold text-gray-400">{t('detail.notFound.message')}</p>
                <p className="text-sm text-gray-300 mt-1">{t('detail.notFound.subtitle')}</p>
                <Link href={`/${locale}/announcements`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:underline">
                  ← {t('detail.notFound.backLink')}
                </Link>
              </div>
            )}

            {/* Content */}
            {!loading && item && (
              <div className="space-y-5">

                {/* Description */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">
                    {t('detail.description')}
                  </h2>
                  <div
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className={`prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap ${isRtl ? 'font-arabic' : ''}`}
                  >
                    {displayContent}
                  </div>
                </div>

                {/* Attachments */}
                {(item.attachments?.length ?? 0) > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-2 mb-5">
                      <Paperclip className="w-4 h-4 text-blue-500" />
                      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                        {t('detail.attachments', { count: item.attachments.length })}
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {item.attachments.map((att) => (
                        <AttachmentCard
                          key={att.key}
                          att={att}
                          onPreview={() => setPreviewAtt(att)}
                          tAttachment={(key) => t(`detail.attachment.${key}` as Parameters<typeof t>[0])}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-8 text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-1">{t('detail.cta.title')}</p>
                  <p className="text-xs text-gray-400 mb-5">{t('detail.cta.subtitle')}</p>
                  <Link
                    href={`/${locale}/contact`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-rmc-green/20"
                  >
                    {t('detail.cta.button')}
                  </Link>
                </div>

              </div>
            )}
          </div>
        </section>
      </main>

      {/* Attachment preview overlay */}
      {previewAtt && (
        <AttachmentPreview
          att={previewAtt}
          onClose={() => setPreviewAtt(null)}
          tAttachment={(key) => t(`detail.attachment.${key}` as Parameters<typeof t>[0])}
        />
      )}

      <Footer />
    </div>
  );
}

// ── Attachment card ───────────────────────────────────────────────────────────

function AttachmentCard({
  att, onPreview, tAttachment,
}: {
  att: Attachment;
  onPreview: () => void;
  tAttachment: (key: string) => string;
}) {
  const url = fileUrl(att.key);
  const canPreview = isPdf(att.mimeType) || isImage(att.mimeType);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-blue-200 transition-colors">
        {isPdf(att.mimeType)
          ? <FileText className="w-5 h-5 text-red-500" />
          : isImage(att.mimeType)
          ? <Eye className="w-5 h-5 text-blue-500" />
          : <Paperclip className="w-5 h-5 text-gray-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{att.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatSize(att.size)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-400 uppercase">{att.mimeType.split('/')[1]}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canPreview && (
          <button
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> {tAttachment('preview')}
          </button>
        )}
        <a
          href={url}
          download={att.name}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rmc-green hover:bg-rmc-green-dark rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> {tAttachment('download')}
        </a>
      </div>
    </div>
  );
}

// ── Attachment preview overlay ────────────────────────────────────────────────

function AttachmentPreview({
  att, onClose, tAttachment,
}: {
  att: Attachment;
  onClose: () => void;
  tAttachment: (key: string) => string;
}) {
  const url = fileUrl(att.key);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">{att.name}</span>
            <span className="text-xs text-gray-400 shrink-0">· {formatSize(att.size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={att.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> {tAttachment('download')}
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {tAttachment('open')}
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg font-light"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {isPdf(att.mimeType) ? (
            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="w-full h-[75vh] rounded-lg border border-gray-200 bg-white"
              title={att.name}
            />
          ) : isImage(att.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={att.name}
              className="max-w-full max-h-[75vh] rounded-lg shadow-lg object-contain"
            />
          ) : (
            <div className="text-center py-16">
              <Paperclip className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{tAttachment('noPreview')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
