'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText, Clock, ChevronLeft, Paperclip, Download,
  Eye, ExternalLink, AlertCircle, Calendar, Flag,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { publicApi } from '@/lib/public-api';
import { fileUrl } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { key: string; name: string; mimeType: string; size: number };

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
  attachments: Attachment[];
};

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDiffDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function deadlineLabel(expiresAt: string | null): string {
  const diff = getDiffDays(expiresAt);
  if (diff === null) return 'No deadline set';
  if (diff < 0) return 'Submission closed';
  if (diff === 0) return 'Closes today';
  if (diff === 1) return 'Closes tomorrow';
  return `Closes in ${diff} days`;
}

function deadlineStyle(expiresAt: string | null) {
  const diff = getDiffDays(expiresAt);
  if (diff === null) return { bar: 'bg-rmc-green', badge: 'bg-rmc-green/10 text-rmc-green border-rmc-green/20' };
  if (diff < 0)  return { bar: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-400 border-gray-200' };
  if (diff <= 3) return { bar: 'bg-red-500',     badge: 'bg-red-50 text-red-600 border-red-200' };
  if (diff <= 7) return { bar: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-600 border-amber-200' };
  return { bar: 'bg-rmc-green', badge: 'bg-rmc-green/10 text-rmc-green border-rmc-green/20' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(mimeType: string) { return mimeType === 'application/pdf'; }
function isImage(mimeType: string) { return mimeType.startsWith('image/'); }

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  high:   { label: 'High',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent',  color: 'bg-red-100 text-red-700 border-red-200' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenderDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);

  useEffect(() => {
    publicApi.getTender(id)
      .then((data) => setTender(data as Tender))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const diff = tender ? getDiffDays(tender.expiresAt) : null;
  const styles = tender ? deadlineStyle(tender.expiresAt) : null;
  const priority = tender ? (PRIORITY_LABELS[tender.priority] ?? PRIORITY_LABELS.normal) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">

        {/* Back */}
        <Link
          href={`/${locale}/tenders`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-rmc-green transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tenders
        </Link>

        {/* Loading */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-2/3 rounded-xl bg-gray-200" />
            <div className="h-4 w-1/3 rounded-xl bg-gray-200" />
            <div className="mt-6 h-40 rounded-2xl bg-gray-200" />
            <div className="h-32 rounded-2xl bg-gray-200" />
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
              <AlertCircle className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-400">Tender not found</p>
            <p className="text-sm text-gray-300 mt-1">It may have been removed or the link is invalid.</p>
            <Link href={`/${locale}/tenders`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:underline">
              ← View all tenders
            </Link>
          </div>
        )}

        {/* Content */}
        {!loading && tender && (
          <div className="space-y-6">
            {(() => {
              const isRtl = locale === 'ar';
              const displayTitle   = resolveText(tender.titleI18n,   tender.title,   locale);
              const displayContent = resolveText(tender.contentI18n, tender.content, locale);

              return (
            <>
            {/* Hero card */}
            <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              {/* Accent bar */}
              <div className={`absolute inset-x-0 top-0 h-1 ${styles!.bar}`} />

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-rmc-gold/10 flex items-center justify-center shrink-0">
                  <FileText className="w-7 h-7 text-rmc-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* Priority */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${priority!.color}`}>
                      <Flag className="w-2.5 h-2.5" />
                      {priority!.label}
                    </span>
                    {/* Deadline badge */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${styles!.badge}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {deadlineLabel(tender.expiresAt)}
                    </span>
                  </div>
                  <h1
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className={`text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-snug ${isRtl ? 'font-arabic' : ''}`}
                  >
                    {displayTitle}
                  </h1>
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-6 pt-5 border-t border-gray-50 flex flex-wrap gap-5 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-300" />
                  Published{' '}
                  <span className="font-medium text-gray-700">
                    {new Date(tender.publishAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                {tender.expiresAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-300" />
                    Deadline{' '}
                    <span className={`font-semibold ${diff !== null && diff <= 3 && diff >= 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {new Date(tender.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Urgency progress bar */}
              {diff !== null && diff >= 0 && diff <= 7 && (
                <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${diff <= 3 ? 'bg-red-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.max(5, 100 - (diff / 7) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                {locale === 'rw' ? 'Ibisobanuro by\'Umushinga' : locale === 'ar' ? 'وصف المناقصة' : 'Tender Description'}
              </h2>
              <div
                dir={isRtl ? 'rtl' : 'ltr'}
                className={`prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap ${isRtl ? 'font-arabic' : ''}`}
              >
                {displayContent}
              </div>
            </div>

            {/* Attachments */}
            {(tender.attachments?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Paperclip className="w-4 h-4 text-rmc-gold" />
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    {locale === 'rw' ? `Inyandiko (${tender.attachments.length})` : locale === 'ar' ? `المرفقات (${tender.attachments.length})` : `Attachments (${tender.attachments.length})`}
                  </h2>
                </div>
                <div className="space-y-3">
                  {tender.attachments.map((att) => (
                    <AttachmentCard
                      key={att.key}
                      att={att}
                      onPreview={() => setPreviewAtt(att)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-rmc-green-deep/5 rounded-2xl border border-rmc-green/10 p-6 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {locale === 'rw' ? 'Uzirikana uyu mushinga?' : locale === 'ar' ? 'مهتم بهذه المناقصة؟' : 'Interested in this tender?'}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {locale === 'rw'
                  ? 'Ohereza igitekerezo cyawe cyangwa watumanahana na RMC mbere y\'igihe.'
                  : locale === 'ar'
                  ? 'قدّم عرضك أو تواصل مع RMC قبل انتهاء الموعد.'
                  : 'Submit your bid or contact RMC before the deadline.'}
              </p>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-rmc-green/20"
              >
                {locale === 'rw' ? 'Watumanahane →' : locale === 'ar' ? 'تواصل مع RMC ←' : 'Contact RMC →'}
              </Link>
            </div>
            </>
              );
            })()}
          </div>
        )}
      </main>

      {/* Attachment preview overlay */}
      {previewAtt && (
        <AttachmentPreview att={previewAtt} onClose={() => setPreviewAtt(null)} />
      )}

      <Footer />
    </div>
  );
}

// ── Attachment card ───────────────────────────────────────────────────────────

function AttachmentCard({ att, onPreview }: { att: Attachment; onPreview: () => void }) {
  const url = fileUrl(att.key);
  const canPreview = isPdf(att.mimeType) || isImage(att.mimeType);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-rmc-gold/30 hover:bg-amber-50/20 transition-all group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-rmc-gold/40 transition-colors">
        {isPdf(att.mimeType)
          ? <FileText className="w-5 h-5 text-red-500" />
          : isImage(att.mimeType)
          ? <Eye className="w-5 h-5 text-blue-500" />
          : <Paperclip className="w-5 h-5 text-gray-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{att.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatSize(att.size)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-400 uppercase">{att.mimeType.split('/')[1]}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {canPreview && (
          <button
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        )}
        <a
          href={url}
          download={att.name}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rmc-green hover:bg-rmc-green-dark rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </a>
      </div>
    </div>
  );
}

// ── Attachment preview overlay ────────────────────────────────────────────────

function AttachmentPreview({ att, onClose }: { att: Attachment; onClose: () => void }) {
  const url = fileUrl(att.key);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-rmc-gold shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">{att.name}</span>
            <span className="text-xs text-gray-400 shrink-0">· {formatSize(att.size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={att.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <FileText className="w-4 h-4 rotate-45" />
            </button>
          </div>
        </div>

        {/* Body */}
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
              <p className="text-sm text-gray-400">No preview available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
