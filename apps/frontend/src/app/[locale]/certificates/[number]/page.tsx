'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Download, Printer, Shield, ArrowLeft, Loader2, FileWarning, Award } from 'lucide-react';
import { marriageApi, type MarriageApplication } from '@/lib/marriageApi';
import {
  buildOfficialCertificateBlob,
  canDownloadOfficial,
  officialCertificateFileName,
} from '@/lib/officialCertificate';

type Phase = 'loading' | 'unavailable' | 'building' | 'ready' | 'error';

export default function CertificatePage() {
  const { locale, number } = useParams<{ locale: string; number: string }>();
  const [app, setApp] = useState<MarriageApplication | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfUrlRef = useRef<string | null>(null);

  // Revoke the object URL only when the page unmounts — never while it's still
  // displayed/downloadable (revoking on every effect re-run breaks downloads).
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  // 1) Load the application.
  useEffect(() => {
    let cancelled = false;
    marriageApi
      .getByNumber(number)
      .then((result) => {
        if (cancelled) return;
        if (!result || !canDownloadOfficial(result)) {
          setApp(result);
          setPhase('unavailable');
          return;
        }
        setApp(result);
        setPhase('building');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  // 2) Build the PDF once the certificate has been issued.
  useEffect(() => {
    if (phase !== 'building' || !app) return;
    let cancelled = false;
    buildOfficialCertificateBlob(app)
      .then((blob) => {
        if (cancelled) return;
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [phase, app]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = app ? officialCertificateFileName(app) : 'marriage-certificate.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ── Loading / building ────────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'building') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">
          {phase === 'loading' ? 'Loading certificate…' : 'Preparing the official certificate…'}
        </p>
      </div>
    );
  }

  // ── Not available (not found / not issued yet) ────────────────────────────
  if (phase === 'unavailable') {
    const notFound = !app;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <Shield className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Certificate not found</p>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          {notFound ? (
            <>No application was found for <span className="font-mono">{number}</span>.</>
          ) : (
            <>
              No issued certificate was found for <span className="font-mono">{number}</span>. The
              certificate may not have been issued yet.
            </>
          )}
        </p>
        <Link
          href={`/${locale}/services/marriage/status?id=${number}`}
          className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Check application status
        </Link>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error' || !pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <FileWarning className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Could not generate the certificate</p>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          Something went wrong while preparing the document. Please try again in a moment.
        </p>
        <button
          onClick={() => setPhase('building')}
          className="text-sm text-green-700 hover:text-green-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Ready — preview + actions ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Heading + actions */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Link
            href={`/${locale}/services/marriage/status?id=${number}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="flex-1 min-w-[1rem]" />
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:border-gray-300 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        {/* Title strip */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Official Marriage Certificate</h1>
            <p className="text-sm text-gray-500">
              {app?.groomName} &amp; {app?.brideName} ·{' '}
              <span className="font-mono">{app?.applicationNumber}</span>
            </p>
          </div>
        </div>

        {/* PDF preview (A4 landscape) — fit to width, no viewer chrome for a clean, large view */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
            title="Official Marriage Certificate"
            className="w-full bg-white"
            style={{ aspectRatio: '842 / 595', minHeight: '55vh' }}
          />
        </div>

        <p className="text-xs text-gray-400 text-center mt-4 max-w-2xl mx-auto">
          This certificate is issued by the Rwanda Muslim Community (RMC). Verify it at{' '}
          <span className="font-mono text-green-700">
            {app?.certificateQrCode ?? `rmc.rw/verify/${app?.applicationNumber}`}
          </span>
          .
        </p>
      </div>
    </div>
  );
}
