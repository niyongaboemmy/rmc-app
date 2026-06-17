'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  LogIn,
  FileText,
  User,
  Users,
  Heart,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  Landmark,
} from 'lucide-react';
import { MarriageWizard } from '@/components/services/marriage/MarriageWizard';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';

// ─── Requirements data ───────────────────────────────────────────────────────

const REQUIRED_DOCUMENTS = [
  {
    icon: User,
    label: "Groom's National ID",
    detail: 'Valid Rwandan National ID (NID) or passport',
  },
  {
    icon: User,
    label: "Bride's National ID",
    detail: 'Valid Rwandan National ID (NID) or passport',
  },
  {
    icon: FileText,
    label: "Wali's Consent Letter",
    detail: "Signed consent from the bride's guardian (Wali)",
  },
  {
    icon: Camera,
    label: 'Couple Portrait Photo',
    detail: 'Recent clear photo of both the groom and bride together',
  },
];

const PROCESS_STEPS = [
  {
    icon: FileText,
    label: 'Submit Application',
    desc: 'Fill the form with couple, ceremony, and document details.',
  },
  {
    icon: Clock,
    label: 'Under Review',
    desc: 'RMC team reviews your documents (1–3 business days).',
  },
  {
    icon: CheckCircle2,
    label: 'Approval & Imam',
    desc: 'Application approved and an imam is assigned to officiate.',
  },
  {
    icon: Landmark,
    label: 'Ceremony (Nikah)',
    desc: 'Nikah conducted at your chosen venue or mosque.',
  },
  {
    icon: Heart,
    label: 'Certificate Issued',
    desc: 'Official marriage certificate signed and delivered.',
  },
];

const FEES = [
  { venue: 'Mosque Ceremony', amount: '10,000 RWF' },
  { venue: 'Outside Mosque', amount: '25,000 RWF' },
];

// ─── Public info view ─────────────────────────────────────────────────────────

function RequirementsView({ locale }: { locale: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="bg-gray-50/60 pattern-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <Link
            href={`/${locale}/services/marriage`}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-rose-700 text-sm font-medium mb-8 transition-colors"
          >
            <LogIn className="w-4 h-4" /> Sign in to Apply
          </Link>
        </div>

        {/* Required documents */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-500" />
            Required Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REQUIRED_DOCUMENTS.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm"
              >
                <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-rose-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Application process */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-500" />
            Application Process
          </h2>
          <div className="relative flex flex-col gap-0">
            {PROCESS_STEPS.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex gap-4">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shrink-0 z-10">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 bg-rose-100 my-1" />
                  )}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fees */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            Service Fees
          </h2>
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            {FEES.map(({ venue, amount }, i) => (
              <div
                key={venue}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < FEES.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-gray-700">{venue}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">{amount}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Payment accepted via Mobile Money (MoMo), cash at the RMC office, or bank transfer.
              </p>
            </div>
          </div>
        </section>

        {/* Witness requirements */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            Witness & Guardian Requirements
          </h2>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-5 py-4 space-y-2.5">
            {[
              'Two Muslim witnesses are required (must present their NIDs)',
              "The bride's Wali (guardian) must provide a signed consent letter",
              'Witnesses must be adult Muslims in good standing',
              'The preferred imam may be requested but is subject to availability',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pb-4">
          <button
            onClick={() => router.push(`/${locale}/login?redirect=/services/marriage/apply`)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-rose-500/20"
          >
            <LogIn className="w-4 h-4" /> Sign in to Submit Application
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Don't have an account?{' '}
            <Link
              href={`/${locale}/register`}
              className="text-rose-600 hover:underline font-medium"
            >
              Request access
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarriageApplyPage() {
  const { locale } = useParams<{ locale: string }>();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <section className="relative h-40 sm:h-52 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
          alt="Islamic marriage celebration"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-rose-950/60 to-black/40" />
        <div className="absolute inset-0 pattern-islamic opacity-20" />

        <div className="relative h-full flex flex-col justify-end pb-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
          <Link
            href={`/${locale}/services/marriage`}
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium mb-3 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Marriage Services
          </Link>
          <p className="text-[10px] font-bold tracking-widest uppercase text-rose-300 mb-1">
            RMC Nikah Service
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {isAuthenticated ? 'Submit Marriage Application' : 'Nikah Application — Requirements'}
          </h1>
        </div>
      </section>

      {/* Loading skeleton */}
      {isLoading && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse mb-6" />
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
        </main>
      )}

      {/* Public: requirements view */}
      {!isLoading && !isAuthenticated && <RequirementsView locale={locale} />}

      {/* Authenticated: full wizard */}
      {!isLoading && isAuthenticated && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <p className="text-gray-500 text-sm mb-6">
            Complete all six steps. Your progress is saved as a draft — you can return to continue
            at any time.
          </p>
          <MarriageWizard />
        </main>
      )}
    </div>
  );
}
