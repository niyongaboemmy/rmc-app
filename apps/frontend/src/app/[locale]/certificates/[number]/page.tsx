'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Download, Printer, QrCode, Shield, ArrowLeft } from 'lucide-react';
import { marriageApi, type MarriageApplication } from '@/lib/marriageApi';

export default function CertificatePage() {
  const { locale, number } = useParams<{ locale: string; number: string }>();
  const [app, setApp] = useState<MarriageApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marriageApi.getByNumber(number).then((result) => {
      setApp(result);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app || app.status !== 'closed' || !app.certificateIssuedAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <Shield className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Certificate not found</p>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          No issued certificate was found for <span className="font-mono">{number}</span>.
          The certificate may not have been issued yet.
        </p>
        <Link
          href={`/${locale}/services/marriage/status?id=${number}`}
          className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Check application status
        </Link>
      </div>
    );
  }

  const issuedDate = new Date(app.certificateIssuedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const ceremonyDate = app.ceremonyDate
    ? new Date(app.ceremonyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        {/* Actions — hidden on print */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <Link
            href={`/${locale}/services/marriage/status?id=${number}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="flex-1" />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:border-gray-300 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <a
            href={`/${locale}/services/marriage/status?id=${number}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100 print:shadow-none print:rounded-none print:border-0">
          {/* Green top border */}
          <div className="h-2 bg-gradient-to-r from-green-600 via-green-500 to-emerald-600" />

          {/* Header */}
          <div className="px-10 pt-10 pb-6 text-center border-b border-gray-100">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-green-600 mb-1">
              Rwanda Muslim Community
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Official Marriage Certificate</h1>
            <p className="text-gray-400 text-sm">Nikah Certificate — Registered under RMC</p>
          </div>

          {/* Certificate body */}
          <div className="px-10 py-8">
            {/* Application number */}
            <div className="text-center mb-8">
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Certificate Number</p>
              <p className="font-mono text-xl font-bold text-gray-900 tracking-wider">{app.applicationNumber}</p>
            </div>

            <p className="text-center text-gray-600 text-sm leading-relaxed mb-8">
              This is to certify that the following Nikah ceremony was duly conducted and registered
              under the authority of the Rwanda Muslim Community (RMC).
            </p>

            {/* Couple */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-center">
                <p className="text-[10px] font-bold tracking-widest uppercase text-blue-500 mb-1">Groom</p>
                <p className="font-bold text-gray-900 text-lg">{app.groomName}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{app.groomNid}</p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-100 px-5 py-4 text-center">
                <p className="text-[10px] font-bold tracking-widest uppercase text-rose-500 mb-1">Bride</p>
                <p className="font-bold text-gray-900 text-lg">{app.brideName}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{app.brideNid}</p>
              </div>
            </div>

            {/* Details table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden mb-8">
              <CertRow label="Ceremony Date" value={ceremonyDate} />
              <CertRow label="Venue" value={app.venueType === 'mosque' ? 'Mosque Ceremony' : 'Outside Mosque'} />
              {app.province && <CertRow label="Location" value={`${app.province}${app.district ? `, ${app.district}` : ''}`} />}
              {app.waliName && <CertRow label="Wali (Guardian)" value={app.waliName} />}
              {app.witness1Name && <CertRow label="Witness 1" value={app.witness1Name} />}
              {app.witness2Name && <CertRow label="Witness 2" value={app.witness2Name} />}
              {app.mahrAmount != null && (
                <CertRow
                  label="Mahr"
                  value={`${Number(app.mahrAmount).toLocaleString()} RWF${app.mahrDescription ? ` — ${app.mahrDescription}` : ''}`}
                />
              )}
              <CertRow label="Certificate Issued" value={issuedDate} />
            </div>

            {/* Wedding photo if available */}
            {app.weddingPhotoUrl && (
              <div className="mb-8 rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={app.weddingPhotoUrl}
                  alt="Wedding ceremony"
                  className="w-full object-cover max-h-64"
                />
              </div>
            )}

            {/* Signature block */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="text-center">
                <div className="h-16 flex items-end justify-center pb-2">
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    RMC Authority
                  </p>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-xs text-gray-500">Mufti / Authorized Signatory</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">Rwanda Muslim Community</p>
                </div>
              </div>
              <div className="text-center">
                <div className="h-16 flex items-end justify-center pb-2">
                  <div className="w-14 h-14 rounded-full border-2 border-green-600 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border border-green-400 flex items-center justify-center">
                      <p className="text-[8px] font-bold text-green-700 text-center leading-tight">RMC<br/>OFFICIAL<br/>SEAL</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-xs text-gray-500">Official Stamp</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">Rwanda Muslim Community</p>
                </div>
              </div>
            </div>

            {/* QR + verification note */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-0.5">Verify this certificate</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Scan the QR code or visit{' '}
                  <span className="font-mono text-green-700">{app.certificateQrCode ?? `rmc.rw/verify/${app.applicationNumber}`}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-5 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              This certificate is issued by the Rwanda Muslim Community (RMC) and is legally valid
              under the jurisdiction of Rwanda. Certificate No: <span className="font-mono font-semibold">{app.applicationNumber}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start border-b border-gray-100 last:border-0 px-4 py-3">
      <p className="w-40 shrink-0 text-[11px] font-bold tracking-wide uppercase text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
