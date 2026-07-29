'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Download, ExternalLink, FileText, X } from 'lucide-react';
import { PreviewOverlayShell, OverlayToolButton as ToolBtn } from '@/components/ui/PreviewOverlayShell';
import { apiClient } from '@/lib/api';
import { dawahApi, type DawahBook } from '@/lib/dawahApi';
import { localized } from './localize';
import { BookFlipReader } from './BookFlipReader';

/**
 * The Library reader — the feature's centrepiece ("preview content on the
 * page"). A sibling of `components/drive/FilePreview.tsx`: both are full-screen
 * dark overlays and both share `PreviewOverlayShell` for the portal, Esc,
 * scroll-lock and focus trap.
 *
 * Every book is public, so there is one path: fetch the bytes as a same-origin
 * blob URL and frame that. We never use a direct <iframe src> at the backend —
 * the preview response carries `X-Frame-Options: SAMEORIGIN` + CSP
 * `frame-ancestors 'self'`, so a cross-origin iframe (the app on :3001 framing
 * the API on :3000) is refused by the browser and renders blank. Fetching the
 * bytes and framing a blob: URL sidesteps the frame policy entirely, and the
 * request simply arrives anonymous, which the backend allows.
 */
export function BookPreviewOverlay({
  book,
  onClose,
  locale,
}: {
  book: DawahBook;
  onClose: () => void;
  locale: string;
}) {
  const t = useTranslations('dawah');

  const title = localized(book, 'title', locale);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobError, setBlobError] = useState(false);

  // Fetch the preview as an object URL. Revoked on unmount so a 20 MB PDF is not
  // pinned in memory for the tab.
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBlobLoading(true);
    setBlobError(false);
    dawahApi.books
      .previewBlobUrl(book.slug)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        created = u;
        setBlobUrl(u);
      })
      .catch(() => {
        if (!cancelled) setBlobError(true);
      })
      .finally(() => {
        if (!cancelled) setBlobLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [book.slug]);

  const pdfUrl = blobUrl;

  // "The reader has painted its first spread" — separate from the fetch, because
  // even a ready URL shows a blank rectangle until pdf.js rasterises page 1, which
  // on a slow connection is exactly the "looks broken" moment the spinner covers.
  const [iframeLoaded, setIframeLoaded] = useState(false);
  useEffect(() => {
    setIframeLoaded(false);
  }, [pdfUrl]);

  const sourceReady = Boolean(pdfUrl) && !blobLoading;
  const error = blobError;
  const showSpinner = !error && (!sourceReady || !iframeLoaded);

  const canDownload = book.allowDownload;

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await apiClient.get(`/dawah/books/${book.slug}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = book.fileName || `${book.slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // The button is only shown when a download is permitted, so a failure here
      // is a transient server/network problem, not a policy denial — stay quiet.
    } finally {
      setDownloading(false);
    }
  };

  const metaLine = [
    book.author,
    book.pageCount ? t('library.pageCount', { count: book.pageCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PreviewOverlayShell
      onClose={onClose}
      labelledBy="book-preview-title"
      className="flex flex-col bg-black/90 backdrop-blur-md"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-gray-900/80 px-3 py-3 text-white sm:gap-3 sm:px-4">
        <FileText className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p id="book-preview-title" className="truncate text-sm font-medium">
            {title}
          </p>
          {metaLine && <p className="truncate text-xs text-gray-400">{metaLine}</p>}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {canDownload && (
            <ToolBtn title={t('library.download')} onClick={handleDownload} className={downloading ? 'opacity-50' : ''}>
              <Download className="h-4 w-4" />
            </ToolBtn>
          )}
          {pdfUrl && (
            <ToolBtn
              title={t('library.openInNewTab')}
              onClick={() => window.open(pdfUrl, '_blank', 'noopener')}
            >
              <ExternalLink className="h-4 w-4" />
            </ToolBtn>
          )}
          <ToolBtn title={t('library.close')} onClick={onClose} className="ms-1 hover:bg-red-600/50">
            <X className="h-4 w-4" />
          </ToolBtn>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
            <AlertCircle className="h-14 w-14 opacity-50" aria-hidden />
            <p className="text-base font-medium">{t('library.previewUnavailable.title')}</p>
            <p className="max-w-sm text-sm text-white/50">{t('library.previewUnavailable.body')}</p>
          </div>
        ) : (
          /*
            The flipbook, at every width. Canvas pages + a pdf.js text layer, so
            Ctrl+F, selection and screen readers still work — see BookFlipReader.
            The reader renders on a phone too (single page, portrait); the header's
            "open in new tab" is the escape hatch for the native viewer.
          */
          <div className="relative h-full">
            {showSpinner && <Spinner label={t('library.loadingBook')} />}
            {pdfUrl && (
              <BookFlipReader
                key={pdfUrl}
                src={pdfUrl}
                onReady={() => setIframeLoaded(true)}
                onFail={() => setBlobError(true)}
              />
            )}
          </div>
        )}
      </div>
    </PreviewOverlayShell>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-rmc-green border-t-transparent" />
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}
