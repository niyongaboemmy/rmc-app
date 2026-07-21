'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, BookOpen, Download, ExternalLink, FileText, Lock, X } from 'lucide-react';
import { PreviewOverlayShell, OverlayToolButton as ToolBtn } from '@/components/ui/PreviewOverlayShell';
import { apiClient } from '@/lib/api';
import { dawahApi, type DawahBook } from '@/lib/dawahApi';
import { useAuth } from '@/hooks/useAuth';
import { localized } from './localize';
import { BookFlipReader } from './BookFlipReader';

/**
 * The Library reader — the feature's centrepiece ("preview content on the
 * page"). A sibling of `components/drive/FilePreview.tsx`: both are full-screen
 * dark overlays and both now share `PreviewOverlayShell` for the portal, Esc,
 * scroll-lock and focus trap.
 *
 * How the bytes are fetched depends ENTIRELY on the access policy the API hands
 * us — never on a storage key (there isn't one). See src/lib/dawahApi.ts.
 *
 *   • public book                    → iframe straight at previewUrl (the
 *                                       backend streams it, anonymous is fine).
 *   • members book, signed in        → previewBlobUrl: a token-carrying fetch,
 *                                       because an <iframe> cannot send the
 *                                       Authorization header the backend needs.
 *   • members book, signed out, with
 *     an excerpt                      → iframe at previewUrl: the backend serves
 *                                       the EXCERPT to an anonymous reader.
 *   • members book, signed out, no
 *     excerpt                         → no fetch at all; the "Sign in to read"
 *                                       card. We know from `visibility`/
 *                                       `hasPreview` that a fetch would 401, so
 *                                       we never make the reader wait for one.
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const title = localized(book, 'title', locale);
  const isMembers = book.visibility === 'members';
  // Auth state hydrates a tick after mount; deciding "blocked" before it settles
  // would flash the sign-in card at a member who is in fact logged in.
  const authPending = isMembers && authLoading;
  const canReadFull = !isMembers || isAuthenticated;
  const showExcerptOnly = isMembers && !authLoading && !isAuthenticated && book.hasPreview;
  const blocked = isMembers && !authLoading && !isAuthenticated && !book.hasPreview;

  // Every readable case streams through a same-origin blob URL, never a direct
  // <iframe src> at the backend. The preview response carries
  // `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`, so a
  // cross-origin iframe (the app on :3001 framing the API on :3000) is refused
  // by the browser and renders blank — which is exactly why the admin proof
  // (blob) worked while this page did not. Fetching the bytes and framing a
  // blob: URL sidesteps the frame policy entirely, and for a public or
  // excerpt book the request simply arrives anonymous, which the backend allows.
  const mode: 'pending' | 'blocked' | 'blob' = authPending
    ? 'pending'
    : blocked
      ? 'blocked'
      : 'blob';

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobError, setBlobError] = useState(false);

  // Fetch the preview as an object URL (WITH the bearer token when signed in;
  // anonymous otherwise). Revoked on unmount so a 20 MB PDF is not pinned in
  // memory for the tab.
  useEffect(() => {
    if (mode !== 'blob') return;
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
        // A token that expired mid-session lands here too — a 401 becomes the
        // same honest "we couldn't load it" as a network failure.
        if (!cancelled) setBlobError(true);
      })
      .finally(() => {
        if (!cancelled) setBlobLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [mode, book.slug]);

  const pdfUrl = mode === 'blob' ? blobUrl : null;

  // "The reader has painted its first spread" — separate from the fetch, because
  // even a ready URL shows a blank rectangle until pdf.js rasterises page 1, which
  // on a slow connection is exactly the "looks broken" moment the spinner covers.
  const [iframeLoaded, setIframeLoaded] = useState(false);
  useEffect(() => {
    setIframeLoaded(false);
  }, [pdfUrl]);

  const sourceReady = Boolean(pdfUrl) && !blobLoading;
  const error = blobError;
  const showSpinner = !error && (mode === 'pending' || !sourceReady || !iframeLoaded);

  const canDownload = book.allowDownload && canReadFull;
  // After signing in, drop the reader back on this book's permalink so the book
  // they wanted is the thing they see, not the homepage.
  const redirectTo = `/${locale}/dawah/library/${book.slug}`;
  const loginHref = `/${locale}/login?redirect=${encodeURIComponent(redirectTo)}`;

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Through apiClient so the token rides along for a members book; a public
      // download simply arrives without one, which the backend allows.
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

        {isMembers && (
          <span className="hidden items-center gap-1 rounded-full bg-rmc-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rmc-gold sm:inline-flex">
            <Lock className="h-3 w-3" aria-hidden />
            {t('library.membersOnly')}
          </span>
        )}

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

      {/* ── Excerpt notice ─────────────────────────────────────────────────── */}
      {showExcerptOnly && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-white/10 bg-rmc-gold/10 px-4 py-2 text-center text-xs text-rmc-gold">
          <span>{t('library.excerptNotice')}</span>
          <Link href={loginHref} className="font-semibold underline underline-offset-2">
            {t('library.signIn')}
          </Link>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {mode === 'blocked' ? (
          <SignInCard
            heading={t('library.signInToRead')}
            body={t('library.signInBody')}
            cta={t('library.signIn')}
            href={loginHref}
          />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
            <AlertCircle className="h-14 w-14 opacity-50" aria-hidden />
            <p className="text-base font-medium">{t('library.previewUnavailable.title')}</p>
            <p className="max-w-sm text-sm text-white/50">{t('library.previewUnavailable.body')}</p>
          </div>
        ) : (
          <>
            {/*
              The flipbook, at every width. Canvas pages + a pdf.js text layer, so
              Ctrl+F, selection and screen readers still work — see BookFlipReader.

              This used to be desktop-only: an <iframe> holding a full-page PDF is
              the worst case on mobile Android/Chrome, where many builds refuse to
              render it inline and show a blank frame or a download chip, so below
              `sm` we handed off to the native viewer instead. That reasoning died
              with the iframe — a canvas the browser paints itself has no such
              quirk, and page-flip turns pages on a swipe. The reader now renders on
              a phone (single page, portrait); the header's "open in new tab" stays
              as the escape hatch for anyone who still wants the native viewer.
            */}
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
          </>
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

function SignInCard({
  heading,
  body,
  cta,
  href,
}: {
  heading: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rmc-green-light text-rmc-green">
          <Lock className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-bold text-gray-900">{heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-rmc-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

