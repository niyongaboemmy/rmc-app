'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Download, Printer, Shield, ArrowLeft, Loader2, FileWarning, ShieldCheck } from 'lucide-react';
import { goodConductApi, type GoodConductCertificateData } from '@/lib/goodConductApi';
import {
  buildGoodConductCertificateBlob,
  goodConductCertificateFileName,
} from '@/lib/goodConductCertificate';

type Phase = 'loading' | 'unavailable' | 'building' | 'ready' | 'error';

// NOTE: the dynamic segment here is named "[number]" to mirror
// certificates/[number]/page.tsx's structure, but its value is actually the
// request's UUID — GET /good-conduct/requests/:id/certificate-data is an
// owner-scoped (JWT) lookup by id, not a public by-certificate-number lookup
// (unlike marriage's by-number endpoint). The status page links here with
// the request id. The public certificate NUMBER is only used by the separate
// /verify/good-conduct/[number] page, which is a genuinely public lookup.
export default function GoodConductCertificatePage() {
  const { locale, number: requestId } = useParams<{ locale: string; number: string }>();
  const [data, setData] = useState<GoodConductCertificateData | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  // 1) Load the certificate data.
  useEffect(() => {
    let cancelled = false;
    goodConductApi
      .getCertificateData(requestId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setPhase('building');
      })
      .catch(() => {
        if (!cancelled) setPhase('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  // 2) Build the PDF once the data has loaded.
  useEffect(() => {
    if (phase !== 'building' || !data) return;
    let cancelled = false;
    buildGoodConductCertificateBlob(data)
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
  }, [phase, data]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = data ? goodConductCertificateFileName(data) : 'good-conduct-certificate.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (phase === 'loading' || phase === 'building') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500">
          {phase === 'loading' ? 'Loading certificate…' : 'Preparing your certificate…'}
        </p>
      </div>
    );
  }

  if (phase === 'unavailable') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <Shield className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Certificate not found</p>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          No issued certificate was found. It may not have been issued yet, or you may not have access to it.
        </p>
        <Link
          href={`/${locale}/services/good-conduct/status`}
          className="text-sm text-indigo-700 hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Check request status
        </Link>
      </div>
    );
  }

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
        <button onClick={() => setPhase('building')} className="text-sm text-indigo-700 hover:text-indigo-800 font-medium">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Link
            href={`/${locale}/services/good-conduct/status`}
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Good Conduct Certificate</h1>
            <p className="text-sm text-gray-500">
              {data?.fullNames} · <span className="font-mono">{data?.certificateNumber}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
            title="Good Conduct Certificate"
            className="w-full bg-white"
            style={{ aspectRatio: '595 / 842', minHeight: '70vh' }}
          />
        </div>

        <p className="text-xs text-gray-400 text-center mt-4 max-w-2xl mx-auto">
          This certificate is issued by the Rwanda Muslim Community (RMC). Verify it at{' '}
          <span className="font-mono text-indigo-700">
            {data?.verifyUrl ?? `rwandamuslim.org/verify/good-conduct/${data?.certificateNumber}`}
          </span>
          .
        </p>
      </div>
    </div>
  );
}
