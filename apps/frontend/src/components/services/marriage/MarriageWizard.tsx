'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users, Calendar, UserCheck, Heart, FileText, CreditCard,
  CheckCircle2, Copy, Check, Search, ArrowRight,
} from 'lucide-react';
import { WizardLayout, WizardStep } from './WizardLayout';
import { Step1Couple } from './steps/Step1Couple';
import { Step2Ceremony } from './steps/Step2Ceremony';
import { Step3Witnesses } from './steps/Step3Witnesses';
import { Step4Mahr } from './steps/Step4Mahr';
import { Step5Documents } from './steps/Step5Documents';
import { Step6Payment } from './steps/Step6Payment';
import { marriageApi, CreateMarriageApplicationPayload, MarriageApplication, SaveDocumentPayload } from '@/lib/marriageApi';
import { FILE_SERVER_URL } from '@/lib/api';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface WizardFormData extends CreateMarriageApplicationPayload {
  // Documents (handled separately)
  groomIdFile?: File;
  brideIdFile?: File;
  waliConsentFile?: File;
  portraitFile?: File;
}

const STEPS: WizardStep[] = [
  { id: 1, label: 'Couple', icon: <Users className="w-4 h-4" /> },
  { id: 2, label: 'Ceremony', icon: <Calendar className="w-4 h-4" /> },
  { id: 3, label: 'Witnesses', icon: <UserCheck className="w-4 h-4" /> },
  { id: 4, label: 'Mahr', icon: <Heart className="w-4 h-4" /> },
  { id: 5, label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 6, label: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
];

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Couple Details', subtitle: 'Enter the groom and bride information as it appears on their National IDs.' },
  2: { title: 'Ceremony Details', subtitle: 'Choose where and when you would like to hold the Nikah ceremony.' },
  3: { title: 'Witnesses & Guardian', subtitle: 'Provide the two Muslim witnesses and the bride\'s Wali (guardian).' },
  4: { title: 'Mahr & Officiant', subtitle: 'Enter the agreed Mahr (dowry) and preferred imam details.' },
  5: { title: 'Supporting Documents', subtitle: 'Upload the required identity documents and photos.' },
  6: { title: 'Payment & Review', subtitle: 'Choose a payment method and review your application before submitting.' },
};

interface SuccessScreenProps {
  app: MarriageApplication;
  locale: string;
  onReset: () => void;
}

function SuccessScreen({ app, locale, onReset }: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(app.applicationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-rose-500" />

      <div className="px-6 sm:px-10 py-10 text-center">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Application submitted</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-8">
          Our team will review your application within 1–3 business days. You will be notified by SMS on every status change.
        </p>

        {/* Application ID card */}
        <div className="max-w-xs mx-auto mb-8 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">Your Application ID</p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="font-mono text-lg font-bold text-gray-900">{app.applicationNumber}</span>
            <button
              type="button"
              onClick={copyId}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-rose-300 hover:text-rose-600 transition-colors"
              aria-label="Copy ID"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Save this — you need it to track your application.</p>
        </div>

        {/* Payment note */}
        {app.paymentMethod !== 'momo' && (
          <div className="max-w-xs mx-auto mb-8 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 text-left">
            {app.paymentMethod === 'cash'
              ? 'Visit the RMC office with your application ID to complete your cash payment.'
              : 'Transfer the fee using your application ID as reference. Confirmation takes 1–2 business days.'}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/services/marriage/status?id=${app.applicationNumber}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors"
          >
            <Search className="w-4 h-4" /> Track application
          </Link>
          <Button variant="outline" onClick={onReset} className="text-sm">
            New application
          </Button>
        </div>
      </div>
    </div>
  );
}

async function uploadFileToServer(file: File, folder: string): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post(`${FILE_SERVER_URL}/api/v1/upload?folder=${folder}`, form, {
    headers: {
      // Do NOT set Content-Type manually — axios/browser must auto-generate it
      // with the multipart boundary (e.g. "multipart/form-data; boundary=----...").
      // Overriding it here strips the boundary and breaks multer parsing.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return (res.data.data ?? res.data).key as string;
}

type DocSlot = { file: File; docType: SaveDocumentPayload['documentType'] };

async function uploadDocuments(draftId: string, slots: DocSlot[]): Promise<void> {
  await Promise.all(
    slots.map(async ({ file, docType }) => {
      try {
        const fileKey = await uploadFileToServer(file, 'marriage-docs');
        await marriageApi.saveDocument(draftId, {
          documentType: docType,
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
      } catch {
        // Document upload failure is non-blocking — application still submits
      }
    }),
  );
}

export function MarriageWizard() {
  const { locale } = useParams<{ locale: string }>();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardFormData>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<MarriageApplication | null>(null);

  const updateData = useCallback((patch: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, 6)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handleStepComplete = useCallback(async (stepData: Partial<WizardFormData>) => {
    updateData(stepData);
    goNext();
  }, [updateData, goNext]);

  const handleFinalSubmit = useCallback(async (finalData: Partial<WizardFormData>) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const merged = { ...formData, ...finalData } as WizardFormData;

    try {
      const payload: CreateMarriageApplicationPayload = {
        notificationPhone: merged.notificationPhone!,
        groomName: merged.groomName!,
        groomNid: merged.groomNid!,
        groomPhone: merged.groomPhone!,
        brideName: merged.brideName!,
        brideNid: merged.brideNid!,
        bridePhone: merged.bridePhone!,
        witness1Nid: merged.witness1Nid!,
        witness1Name: merged.witness1Name!,
        witness2Nid: merged.witness2Nid!,
        witness2Name: merged.witness2Name!,
        waliName: merged.waliName,
        waliNid: merged.waliNid,
        waliPhone: merged.waliPhone,
        mahrAmount: merged.mahrAmount,
        mahrDescription: merged.mahrDescription,
        requestedOfficiant: merged.requestedOfficiant,
        venueType: merged.venueType!,
        province: merged.province!,
        district: merged.district!,
        mosqueId: merged.mosqueId,
        venueAddress: merged.venueAddress,
        preferredDateFrom: merged.preferredDateFrom!,
        preferredDateTo: merged.preferredDateTo,
        paymentMethod: merged.paymentMethod!,
      };

      let draft: MarriageApplication;
      if (draftId) {
        draft = await marriageApi.updateDraft(draftId, payload);
      } else {
        draft = await marriageApi.createDraft(payload);
        setDraftId(draft.id);
      }

      // Upload Step5 documents to file-server then record them in the backend
      const docSlots: DocSlot[] = [
        merged.groomIdFile   && { file: merged.groomIdFile,   docType: 'groom_id' },
        merged.brideIdFile   && { file: merged.brideIdFile,   docType: 'bride_id' },
        merged.waliConsentFile && { file: merged.waliConsentFile, docType: 'wali_consent' },
        merged.portraitFile  && { file: merged.portraitFile,  docType: 'portrait' },
      ].filter(Boolean) as DocSlot[];
      if (docSlots.length > 0) {
        await uploadDocuments(draft.id, docSlots);
      }

      const submitted = await marriageApi.submit(draft.id);
      setSubmittedApp(submitted);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit application. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, draftId]);

  const reset = useCallback(() => {
    setStep(1);
    setFormData({});
    setDraftId(null);
    setSubmittedApp(null);
    setSubmitError(null);
  }, []);

  if (submittedApp) {
    return <SuccessScreen app={submittedApp} locale={locale} onReset={reset} />;
  }

  const stepInfo = STEP_TITLES[step];

  return (
    <WizardLayout
      steps={STEPS}
      currentStep={step}
      title={stepInfo.title}
      subtitle={stepInfo.subtitle}
    >
      {submitError && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <Step1Couple
          initialData={formData}
          onNext={handleStepComplete}
        />
      )}
      {step === 2 && (
        <Step2Ceremony
          initialData={formData}
          onNext={handleStepComplete}
          onBack={goBack}
        />
      )}
      {step === 3 && (
        <Step3Witnesses
          initialData={formData}
          groomNid={formData.groomNid ?? ''}
          brideNid={formData.brideNid ?? ''}
          onNext={handleStepComplete}
          onBack={goBack}
        />
      )}
      {step === 4 && (
        <Step4Mahr
          initialData={formData}
          onNext={handleStepComplete}
          onBack={goBack}
        />
      )}
      {step === 5 && (
        <Step5Documents
          initialData={formData}
          onNext={handleStepComplete}
          onBack={goBack}
        />
      )}
      {step === 6 && (
        <Step6Payment
          formData={formData}
          onBack={goBack}
          onSubmit={handleFinalSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </WizardLayout>
  );
}
