'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText, Clock, Paperclip, Download,
  Eye, ExternalLink, AlertCircle, Calendar, Flag, ListChecks, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { publicApi } from '@/lib/public-api';
import { fileUrl } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { TenderApplyButton } from '@/components/services/tender/TenderApplyButton';
import { readDeadline, getLifecycle, type Lifecycle } from '@/lib/deadline';

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { key: string; name: string; mimeType: string; size: number };

type I18n = { en: string; rw: string; ar: string };

type Tender = {
  id: string;
  title: string;
  content: string;
  titleI18n: I18n | null;
  contentI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
  attachments: Attachment[];
};

type Status = Lifecycle;

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Status, `isClosed`, and the countdown all derive from `@/lib/deadline`, which
// compares raw timestamps the way `assertTenderOpen` does on the backend. That
// agreement is what keeps the Apply button below from being offered on a tender
// the API will reject.

// Status-driven accents, spelled out for the JIT.
const STATUS_STYLES: Record<Status, { dot: string; chip: string; heroChip: string }> = {
  open: {
    dot: 'bg-rmc-green',
    chip: 'bg-rmc-green/10 text-rmc-green',
    heroChip: 'bg-white/10 border-white/20 text-white',
  },
  closing: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600',
    heroChip: 'bg-amber-400/20 border-amber-200/40 text-amber-50',
  },
  closed: {
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-500',
    heroChip: 'bg-white/10 border-white/20 text-white/70',
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isPdf(mimeType: string) { return mimeType === 'application/pdf'; }
function isImage(mimeType: string) { return mimeType.startsWith('image/'); }

const PRIORITY_COLOR: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

/** What a bid must carry — mirrors REQUIRED_DOCUMENTS and the DB CHECK constraint. */
const REQUIREMENT_KEYS = ['rdb', 'tax', 'proposal', 'company', 'deadline'] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenderDetailPage() {
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const t = useTranslations('tenders');
  // The "what you need before you start" copy lives in the tender-service namespace.
  const tReq = useTranslations('services.tender.landing');
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);

  useEffect(() => {
    publicApi
      .getTender(slug)
      .then((data) => setTender(data as Tender))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const deadline = readDeadline(tender?.expiresAt);
  // A tender with no deadline never closes.
  const isClosed = deadline.closed;
  const status: Status = tender ? getLifecycle(tender.expiresAt) : 'open';
  const styles = STATUS_STYLES[status];
  const priorityColor = tender ? (PRIORITY_COLOR[tender.priority] ?? PRIORITY_COLOR.normal) : null;
  const priorityLabel = tender
    ? t(`detail.priority.${tender.priority as 'normal' | 'high' | 'urgent'}`)
    : '';

  const isRtl = locale === 'ar';
  const displayTitle = tender ? resolveText(tender.titleI18n, tender.title, locale) : '';
  const displayContent = tender ? resolveText(tender.contentI18n, tender.content, locale) : '';

  function deadlineRelative(expiresAt: string | null): string {
    const d = readDeadline(expiresAt);
    switch (d.state) {
      case 'none':
        return t('deadline.noneSet');
      case 'closed':
        return t('deadline.submissionClosed');
      case 'today':
        return t('deadline.today');
      case 'tomorrow':
        return t('deadline.tomorrow');
      default:
        return t('deadline.inDays', { days: d.days });
    }
  }

  const deadlineTone = deadline.closed
    ? 'text-gray-400'
    : deadline.days === null
    ? 'text-gray-500'
    : deadline.days <= 3
    ? 'text-red-600'
    : deadline.days <= 7
    ? 'text-amber-600'
    : 'text-rmc-green';

  const heroTitle = loading
    ? t('detail.heroTitle')
    : notFound
    ? t('detail.notFoundHeroTitle')
    : displayTitle;

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <main>
        {/* Body */}
        <section className="pt-24 md:pt-28 pb-12 sm:pb-14 bg-gray-50 pattern-light">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header card — replaces the old hero banner: back link, eyebrow,
                title and status/priority chips. */}
            {!notFound && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
                <Link
                  href={`/${locale}/services/tender`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('detail.backLabel')}
                </Link>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
                  {t('eyebrow')}
                </p>
                <h1
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className={`mt-1 text-2xl md:text-3xl font-bold text-gray-900 ${isRtl ? 'font-arabic' : ''}`}
                >
                  {heroTitle}
                </h1>
                {tender && (
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${styles.chip}`}>
                      <Clock className="h-3 w-3" />
                      {deadlineRelative(tender.expiresAt)}
                    </span>
                    {priorityColor && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${priorityColor}`}>
                        <Flag className="h-3 w-3" />
                        {priorityLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Loading skeletons */}
            {loading && (
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 animate-pulse">
                <div className="h-72 rounded-2xl bg-white border border-gray-100 lg:col-span-1" />
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 rounded-2xl bg-white border border-gray-100" />
                  <div className="h-40 rounded-2xl bg-white border border-gray-100" />
                </div>
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
                <Link
                  href={`/${locale}/services/tender`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:underline"
                >
                  ← {t('detail.notFound.backLink')}
                </Link>
              </div>
            )}

            {/* Content */}
            {!loading && tender && (
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main column — description + attachments (right on desktop) */}
                <div className="order-2 lg:order-2 lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 sm:p-6">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <FileText className="w-4 h-4 text-rmc-green" />
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
                  {(tender.attachments?.length ?? 0) > 0 && (
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 sm:p-6">
                      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Paperclip className="w-4 h-4 text-rmc-green" />
                        {t('detail.attachments', { count: tender.attachments.length })}
                      </h2>
                      <div className="space-y-3">
                        {tender.attachments.map((att) => (
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

                  {/* What you need before you start — requirements checklist */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 sm:p-6">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <ListChecks className="w-4 h-4 text-rmc-green" />
                      {tReq('requirementsTitle')}
                    </h2>
                    <p className="mb-4 text-sm text-gray-500">{tReq('requirementsSubtitle')}</p>
                    <ul className="space-y-4">
                      {REQUIREMENT_KEYS.map((key) => (
                        <li key={key} className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rmc-green" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{tReq(`requirements.${key}.title`)}</p>
                            <p className="text-sm leading-relaxed text-gray-500">{tReq(`requirements.${key}.text`)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sidebar — key facts + apply CTA; left on desktop, first on mobile */}
                <aside className="order-1 lg:order-1 lg:col-span-1">
                  <div className="lg:sticky lg:top-24 space-y-5">
                    {/* Overview card */}
                    <div className="rounded-lg bg-white border border-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-50">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                          {t(`filters.${status}`)}
                        </span>
                        {priorityColor && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${priorityColor}`}>
                            <Flag className="w-2.5 h-2.5" />
                            {priorityLabel}
                          </span>
                        )}
                      </div>

                      <dl className="p-5 space-y-4 text-sm">
                        {/* Deadline */}
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                            <Clock className="w-4 h-4 text-gray-400" />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {t('detail.deadlineLabel')}
                            </dt>
                            <dd className="font-semibold text-gray-900">
                              {tender.expiresAt ? formatDate(tender.expiresAt) : t('deadline.noneSet')}
                            </dd>
                            <dd className={`text-xs font-medium mt-0.5 ${deadlineTone}`}>
                              {deadlineRelative(tender.expiresAt)}
                            </dd>
                          </div>
                        </div>

                        {/* Published */}
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {t('detail.published')}
                            </dt>
                            <dd className="font-semibold text-gray-900">{formatDate(tender.publishAt)}</dd>
                          </div>
                        </div>

                        {/* Documents (count) */}
                        {(tender.attachments?.length ?? 0) > 0 && (
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            </span>
                            <div className="min-w-0">
                              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                {t('detail.attachments', { count: tender.attachments.length })}
                              </dt>
                            </div>
                          </div>
                        )}
                      </dl>

                      {/* Days remaining — a highlighted count, colour-coded by urgency.
                          Gone once closed: counting down to a deadline that has
                          already passed is the thing this page must never do. */}
                      {!deadline.closed && deadline.days !== null && (
                        <div className="px-5 pb-5 -mt-1">
                          {deadline.days === 0 ? (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-bold">{t('deadline.today')}</span>
                            </div>
                          ) : (
                            <div
                              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                                deadline.days <= 3 ? 'bg-red-50' : deadline.days <= 7 ? 'bg-amber-50' : 'bg-rmc-green-light/50'
                              }`}
                            >
                              <span
                                className={`text-3xl font-extrabold leading-none tabular-nums ${
                                  deadline.days <= 3 ? 'text-red-600' : deadline.days <= 7 ? 'text-amber-600' : 'text-rmc-green'
                                }`}
                              >
                                {deadline.days}
                              </span>
                              <span className="text-xs font-semibold text-gray-600">
                                {t(deadline.days === 1 ? 'deadline.dayRemaining' : 'deadline.daysRemaining')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Apply CTA — deep-links into the wizard with this tender pre-selected
                        and its picker locked. Hidden once the deadline has passed: the
                        backend refuses a late bid, so offering the button would only walk
                        the bidder into a 400. */}
                    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm text-center">
                      <p className="text-sm font-bold text-gray-900">{t('detail.cta.title')}</p>
                      <p className="mt-1 mb-4 text-xs leading-relaxed text-gray-500">{t('detail.cta.subtitle')}</p>
                      {isClosed ? (
                        <p className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-400">
                          {t('deadline.submissionClosed')}
                        </p>
                      ) : (
                        <TenderApplyButton tenderId={tender.id} label={t('detail.cta.button')} />
                      )}
                    </div>
                  </div>
                </aside>
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
  att,
  onPreview,
  tAttachment,
}: {
  att: Attachment;
  onPreview: () => void;
  tAttachment: (key: string) => string;
}) {
  const url = fileUrl(att.key);
  const canPreview = isPdf(att.mimeType) || isImage(att.mimeType);

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-lg border border-gray-100 hover:border-rmc-green/30 hover:bg-rmc-green-light/20 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-rmc-green/40 transition-colors">
        {isPdf(att.mimeType) ? (
          <FileText className="w-5 h-5 text-red-500" />
        ) : isImage(att.mimeType) ? (
          <Eye className="w-5 h-5 text-blue-500" />
        ) : (
          <Paperclip className="w-5 h-5 text-gray-400" />
        )}
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
  att,
  onClose,
  tAttachment,
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
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <FileText className="w-4 h-4 rotate-45" />
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
