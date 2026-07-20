'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users, Calendar, UserCheck, Heart, FileText, CreditCard,
  CheckCircle2, Copy, Check, Search, Phone, Send, ChevronDown, ChevronUp,
  Smartphone, Loader2, RefreshCw,
} from 'lucide-react';
import { WizardLayout, WizardStep } from './WizardLayout';
import { Step1Couple } from './steps/Step1Couple';
import { Step2Ceremony } from './steps/Step2Ceremony';
import { Step3Witnesses } from './steps/Step3Witnesses';
import { Step4Mahr } from './steps/Step4Mahr';
import { Step5Documents } from './steps/Step5Documents';
import { Step6Payment } from './steps/Step6Payment';
import {
  marriageApi,
  CreateMarriageApplicationPayload,
  MarriageApplication,
  SaveDocumentPayload,
  MarriageFees,
} from '@/lib/marriageApi';
import { FILE_SERVER_URL } from '@/lib/api';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WizardFormData extends CreateMarriageApplicationPayload {
  groomIdFile?: File;
  brideIdFile?: File;
  groomPhotoFile?: File;
  bridePhotoFile?: File;
  waliConsentFile?: File;
  portraitFile?: File;
  mobilePhone?: string;
}

// File fields are stripped before persisting (File can't survive JSON).
type FileFieldKey =
  | 'groomIdFile'
  | 'brideIdFile'
  | 'groomPhotoFile'
  | 'bridePhotoFile'
  | 'waliConsentFile'
  | 'portraitFile';

type PaymentPhase = 'idle' | 'waiting' | 'confirmed';

// Serialisable slice — File objects can't survive JSON.stringify
type PersistedState = {
  step: number;
  formData: Omit<WizardFormData, FileFieldKey>;
  draftId: string | null;
  paymentPhase: PaymentPhase;
  pendingAppId: string | null;
  pendingAppNumber: string | null;
  pendingAppAmountDue: number | null;
};

const WIZARD_KEY = 'rmc_marriage_wizard_v1';

// In local development (`next dev`), skip the real MoMo charge: mark the payment
// as completed on the backend and go straight to the provisional certificate.
// This branch is statically eliminated from production builds, and the backend
// endpoint it calls is itself hard-blocked in production.
const IS_DEV = process.env.NODE_ENV === 'development';

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIZARD_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch { return null; }
}

function savePersistedState(s: PersistedState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(WIZARD_KEY, JSON.stringify(s)); } catch { /* quota full */ }
}

function clearPersistedState() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(WIZARD_KEY); } catch { /* ignore */ }
}

// ── Constants ───────────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  { id: 1, label: 'Couple',    icon: <Users className="w-4 h-4" /> },
  { id: 2, label: 'Ceremony',  icon: <Calendar className="w-4 h-4" /> },
  { id: 3, label: 'Witnesses', icon: <UserCheck className="w-4 h-4" /> },
  { id: 4, label: 'Mahr',      icon: <Heart className="w-4 h-4" /> },
  { id: 5, label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 6, label: 'Payment',   icon: <CreditCard className="w-4 h-4" /> },
];

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Couple Details',          subtitle: 'Enter the groom and bride information as it appears on their National IDs.' },
  2: { title: 'Ceremony Details',        subtitle: 'Choose where and when you would like to hold the Nikah ceremony.' },
  3: { title: 'Witnesses & Guardian',    subtitle: "Provide the two Muslim witnesses and the bride's Wali (guardian)." },
  4: { title: 'Mahr & Officiant',        subtitle: 'Enter the agreed Mahr (dowry) and preferred imam details.' },
  5: { title: 'Supporting Documents',    subtitle: 'Upload the required identity documents and photos.' },
  6: { title: 'Payment & Review',        subtitle: 'Select a fee tier, choose a payment method, and submit your application.' },
};

const PARTY_ROLES = [
  { role: 'groom', label: 'Groom (Umugabo)',          placeholder: '+250 7XX XXX XXX' },
  { role: 'bride', label: 'Bride (Umugeni)',           placeholder: '+250 7XX XXX XXX' },
  { role: 'wali',  label: "Bride's Wali / Guardian",  placeholder: '+250 7XX XXX XXX' },
  { role: 'imam',  label: 'Imam (Officiant)',          placeholder: '+250 7XX XXX XXX' },
] as const;

type PartyRole = typeof PARTY_ROLES[number]['role'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractMsg(err: unknown): string {
  return (
    (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
      ?.response?.data?.error?.message ||
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err instanceof Error ? err.message : '') ||
    'Something went wrong. Please try again.'
  );
}

// ── Party confirmation form ─────────────────────────────────────────────────

function PartyPhonesForm({ applicationId }: { applicationId: string }) {
  const [open, setOpen]     = useState(false);
  const [phones, setPhones] = useState<Record<PartyRole, string>>({ groom: '', bride: '', wali: '', imam: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  const handleSend = async () => {
    const parties = PARTY_ROLES.map(({ role }) => ({ role, phone: phones[role].trim() })).filter((p) => p.phone);
    if (!parties.length) { setErr('Enter at least one phone number.'); return; }
    setSending(true); setErr(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
      const base  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const res   = await fetch(`${base}/marriage/applications/${applicationId}/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ parties }),
      });
      if (!res.ok) throw new Error('Failed');
      setSent(true);
    } catch {
      setErr('Could not send confirmation requests. You can do this later from your application status page.');
    } finally { setSending(false); }
  };

  if (sent) return (
    <div className="max-w-xs mx-auto mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700 text-left flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
      Confirmation SMS requests sent to all provided party numbers.
    </div>
  );

  return (
    <div className="max-w-sm mx-auto mt-6">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-rose-400 text-sm text-gray-600 hover:text-rose-700 transition-colors">
        <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Send confirmation requests to parties</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <p className="text-xs text-gray-500">Enter phone numbers for each party. They will receive an SMS with a link to confirm their participation.</p>
          {PARTY_ROLES.map(({ role, label, placeholder }) => (
            <div key={role}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
              <input type="tel" value={phones[role]} onChange={(e) => setPhones((p) => ({ ...p, [role]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400" />
            </div>
          ))}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button onClick={handleSend} disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {sending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send Confirmation Requests'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Success screen ──────────────────────────────────────────────────────────

function SuccessScreen({ app, locale, onReset }: { app: MarriageApplication; locale: string; onReset: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try { await navigator.clipboard.writeText(app.trackingCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1 bg-rose-500" />
      <div className="px-6 sm:px-10 py-10 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application submitted</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-8">
          Our team will review your application within 1–3 business days. You will be notified by SMS on every status change.
        </p>
        <div className="max-w-xs mx-auto mb-8 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">Your tracking code</p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="font-mono text-lg font-bold text-gray-900">{app.trackingCode}</span>
            <button type="button" onClick={copyId}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-rose-300 hover:text-rose-600 transition-colors"
              aria-label="Copy tracking code">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Save this — with your phone number you use it to track your application.</p>
        </div>
        {app.paymentStatus === 'paid' && (
          <Link
            href={`/${locale}/certificates/${app.applicationNumber}/provisional`}
            className="group max-w-md mx-auto mb-2 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-4 shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Download provisional certificate</p>
              <p className="text-white/80 text-xs">Your payment is confirmed — preview &amp; download it now.</p>
            </div>
          </Link>
        )}
        <PartyPhonesForm applicationId={app.id} />
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link href={`/${locale}/services/marriage/status`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors">
            <Search className="w-4 h-4" /> Track application
          </Link>
          <Button variant="outline" onClick={onReset} className="text-sm">New application</Button>
        </div>
      </div>
    </div>
  );
}

// ── Payment waiting screen ──────────────────────────────────────────────────

function PaymentWaitingScreen({
  applicationNumber, phone, amount, onCancel, onResend, isResending,
}: {
  applicationNumber: string;
  phone: string;
  amount: number;
  onCancel: () => void;
  onResend: () => void;
  isResending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="relative w-24 h-24">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute inset-0 rounded-full border-2 border-rose-400 opacity-0"
            style={{ animation: `_momo-ripple 2s ease-out ${i * 0.6}s infinite` }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-rose-50 border-2 border-rose-200">
          <Smartphone className="w-10 h-10 text-rose-500" />
        </div>
      </div>

      <style>{`@keyframes _momo-ripple { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }`}</style>

      <div>
        <h3 className="text-xl font-bold text-gray-900">Waiting for payment</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          A MoMo push prompt has been sent to <strong>{phone}</strong>. Accept it on your phone to confirm.
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 px-6 py-4 text-sm text-gray-700 space-y-1 text-left min-w-[260px]">
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Application</span>
          <span className="font-mono font-semibold">{applicationNumber}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Amount</span>
          <span className="font-bold text-gray-900">{amount.toLocaleString()} RWF</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
        Checking payment status…
      </div>

      {/* Resend */}
      <button
        onClick={onResend}
        disabled={isResending}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
          isResending
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : 'border-rose-200 text-rose-600 hover:bg-rose-50',
        )}
      >
        {isResending
          ? <><span className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" /> Sending…</>
          : <><RefreshCw className="w-4 h-4" /> Resend MoMo prompt</>
        }
      </button>

      <button onClick={onCancel}
        className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors">
        Cancel and go back
      </button>
    </div>
  );
}

// ── Payment confirmed popup ─────────────────────────────────────────────────

function PaymentConfirmedPopup({ applicationNumber, onContinue }: { applicationNumber: string; onContinue: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const AUTO_CLOSE = 30;

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
  }, []);

  useEffect(() => {
    if (!entered) return;
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); onContinue(); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [entered, onContinue]);

  if (!mounted) return null;

  const circumference = 2 * Math.PI * 22;
  const progress = countdown / AUTO_CLOSE;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <style>{`
        @keyframes _pc-overlay { from{opacity:0} to{opacity:1} }
        @keyframes _pc-card { from{opacity:0;transform:scale(.88) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes _pc-check { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
        @keyframes _pc-ring  { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.18);opacity:.15} }
        @keyframes _pc-sparkle { 0%{opacity:0;transform:scale(0) translateY(0)} 30%{opacity:1} 100%{opacity:0;transform:scale(1.2) translateY(-28px)} }
      `}</style>
      <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',animation:'_pc-overlay .3s ease forwards' }} />
      <div style={{ position:'relative',background:'#fff',borderRadius:'1.5rem',padding:'2.5rem 2rem',maxWidth:'22rem',width:'100%',textAlign:'center',boxShadow:'0 32px 80px rgba(0,0,0,.25)',animation:entered?'_pc-card .45s cubic-bezier(.34,1.56,.64,1) forwards':'none' }}>
        <div style={{ position:'relative',width:96,height:96,margin:'0 auto 1.5rem' }}>
          {[0,1].map((i) => (
            <span key={i} style={{ position:'absolute',inset:0,borderRadius:'50%',border:'2px solid #22c55e',animation:`_pc-ring 2s ease-in-out ${i*.8}s infinite` }} />
          ))}
          <div style={{ position:'absolute',inset:0,borderRadius:'50%',background:'linear-gradient(135deg,#bbf7d0,#86efac)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M13 25l8 8 14-16" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="60" strokeDashoffset="60"
                style={{ animation:entered?'_pc-check .5s .3s ease forwards':'none' }} />
            </svg>
          </div>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 360;
            const rad   = (angle * Math.PI) / 180;
            return (
              <span key={i} style={{ position:'absolute',left:48+44*Math.cos(rad)-4,top:48+44*Math.sin(rad)-4,width:8,height:8,borderRadius:'50%',background:i%2===0?'#22c55e':'#86efac',animation:entered?`_pc-sparkle .8s ${.3+i*.05}s ease-out forwards`:'none',opacity:0 }} />
            );
          })}
        </div>
        <h2 style={{ fontSize:'1.25rem',fontWeight:700,color:'#111827',marginBottom:'.5rem' }}>Payment Confirmed!</h2>
        <p style={{ fontSize:'.875rem',color:'#6b7280',marginBottom:'1.25rem',lineHeight:1.5 }}>
          Your MoMo payment was received. Your application <strong style={{ color:'#111827' }}>{applicationNumber}</strong> will now be submitted.
        </p>
        <div style={{ position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:'.5rem' }}>
          <svg width="56" height="56" style={{ position:'absolute',transform:'rotate(-90deg)' }}>
            <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#22c55e" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={circumference*(1-progress)}
              strokeLinecap="round" style={{ transition:'stroke-dashoffset .9s linear' }} />
          </svg>
          <button onClick={onContinue} style={{ width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',fontWeight:700,fontSize:'.75rem',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',lineHeight:1 }}>
            <span style={{ fontSize:'1rem',fontWeight:800 }}>{countdown}</span>
            <span style={{ fontSize:'.6rem',opacity:.8 }}>Continue</span>
          </button>
        </div>
        <p style={{ fontSize:'.7rem',color:'#9ca3af',marginTop:'.5rem' }}>Auto-continues in {countdown}s</p>
      </div>
    </div>,
    document.body,
  );
}

// ── File helpers ────────────────────────────────────────────────────────────

/**
 * Downscale + re-encode large images before upload so submitting is fast. The
 * certificate and ID scans don't need full-resolution camera photos, so a 5 MB
 * image becomes a few hundred KB. PDFs / non-images and already-small images are
 * returned unchanged.
 */
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= 600 * 1024) { bmp.close?.(); return file; }
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bmp.close?.(); return file; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file; // keep original if no gain
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function uploadFileToServer(file: File, folder: string): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  const form  = new FormData();
  form.append('file', file);
  const res = await axios.post(`${FILE_SERVER_URL}/api/v1/upload?folder=${folder}`, form, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return (res.data.data ?? res.data).key as string;
}

type DocSlot = { file: File; docType: SaveDocumentPayload['documentType'] };
const DOC_LABELS: Record<string, string> = { groom_id:"Groom's National ID", bride_id:"Bride's National ID", groom_photo:"Groom's photo", bride_photo:"Bride's photo", wali_consent:'Wali consent letter', portrait:'Couple portrait' };

async function uploadDocuments(draftId: string, slots: DocSlot[]): Promise<void> {
  const failed: string[] = [];
  await Promise.all(slots.map(async ({ file, docType }) => {
    try {
      const up = await compressImage(file);
      const fileKey = await uploadFileToServer(up, 'marriage-docs');
      await marriageApi.saveDocument(draftId, { documentType: docType, fileKey, fileName: up.name, fileSize: up.size, mimeType: up.type });
    } catch { failed.push(DOC_LABELS[docType] ?? docType); }
  }));
  if (failed.length > 0) throw new Error(`Could not upload: ${failed.join(', ')}. Please check your connection and try again — your details are saved.`);
}

// ── Main wizard ─────────────────────────────────────────────────────────────

export function MarriageWizard() {
  const { locale } = useParams<{ locale: string }>();

  // ── State ─────────────────────────────────────────────────────────────────

  const [hydrated, setHydrated]       = useState(false);
  const [step, setStep]               = useState(1);
  const [formData, setFormData]       = useState<Partial<WizardFormData>>({});
  const [draftId, setDraftId]         = useState<string | null>(null);
  const [fees, setFees]               = useState<MarriageFees | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending]   = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<MarriageApplication | null>(null);

  const [paymentPhase, setPaymentPhase]       = useState<PaymentPhase>('idle');
  const [pendingDraftApp, setPendingDraftApp] = useState<MarriageApplication | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Persistence helpers ───────────────────────────────────────────────────

  const persist = useCallback((
    s: number,
    fd: Partial<WizardFormData>,
    did: string | null,
    phase: PaymentPhase,
    pApp: MarriageApplication | null,
  ) => {
    const {
      groomIdFile: _a, brideIdFile: _b, groomPhotoFile: _e, bridePhotoFile: _f,
      waliConsentFile: _c, portraitFile: _d, ...serializableFormData
    } = fd as WizardFormData;
    savePersistedState({
      step: s,
      formData: serializableFormData,
      draftId: did,
      paymentPhase: phase,
      pendingAppId:        pApp?.id          ?? null,
      pendingAppNumber:    pApp?.applicationNumber ?? null,
      pendingAppAmountDue: pApp?.amountDue   ?? null,
    });
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((appId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const result = await marriageApi.checkPaymentStatus(appId);
        if (result.paymentStatus === 'paid' || result.gatewayStatus === 'SUCCESSFUL') {
          stopPolling();
          const app = await marriageApi.getById(appId);
          setPendingDraftApp(app);
          setPaymentPhase('confirmed');
        } else if (result.paymentStatus === 'failed' || result.gatewayStatus === 'FAILED') {
          stopPolling();
          setPaymentPhase('idle');
          setIsSubmitting(false);
          setSubmitError('MoMo payment was declined. Please try again.');
        }
      } catch { /* transient error — keep polling */ }
    }, 5000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Hydrate from localStorage on first mount ──────────────────────────────

  useEffect(() => {
    const saved = loadPersistedState();
    if (!saved) { setHydrated(true); return; }

    setStep(saved.step);
    setFormData(saved.formData as Partial<WizardFormData>);
    setDraftId(saved.draftId);

    if (saved.paymentPhase === 'waiting' && saved.pendingAppId) {
      // Stub app so the waiting screen renders immediately
      const stubApp = {
        id: saved.pendingAppId,
        applicationNumber: saved.pendingAppNumber ?? '',
        amountDue: saved.pendingAppAmountDue ?? 0,
      } as MarriageApplication;
      setPendingDraftApp(stubApp);
      setPaymentPhase('waiting');

      // Check immediately whether payment already went through
      marriageApi.checkPaymentStatus(saved.pendingAppId).then(async (result) => {
        if (result.paymentStatus === 'paid' || result.gatewayStatus === 'SUCCESSFUL') {
          stopPolling();
          const app = await marriageApi.getById(saved.pendingAppId!);
          setPendingDraftApp(app);
          setPaymentPhase('confirmed');
        } else if (result.paymentStatus === 'failed' || result.gatewayStatus === 'FAILED') {
          setPaymentPhase('idle');
          setSubmitError('Previous MoMo payment was declined. Please try again.');
        } else {
          startPolling(saved.pendingAppId!);
        }
      }).catch(() => { startPolling(saved.pendingAppId!); });
    } else if (saved.paymentPhase === 'confirmed' && saved.pendingAppId) {
      // Was confirmed before reload — restore so user can click Continue
      const stubApp = {
        id: saved.pendingAppId,
        applicationNumber: saved.pendingAppNumber ?? '',
        amountDue: saved.pendingAppAmountDue ?? 0,
      } as MarriageApplication;
      setPendingDraftApp(stubApp);
      setPaymentPhase('confirmed');
    }

    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save whenever key state changes ──────────────────────────────────

  useEffect(() => {
    if (!hydrated) return;
    persist(step, formData, draftId, paymentPhase, pendingDraftApp);
  }, [hydrated, step, formData, draftId, paymentPhase, pendingDraftApp, persist]);

  // ── Fetch fees ────────────────────────────────────────────────────────────

  useEffect(() => {
    marriageApi.getFees().then(setFees).catch(() => { /* use fallback */ });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

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
        groomName: merged.groomName!, groomNid: merged.groomNid!, groomFatherName: merged.groomFatherName!, groomBirthDate: merged.groomBirthDate!, groomPhone: merged.groomPhone!,
        brideName: merged.brideName!, brideNid: merged.brideNid!, brideFatherName: merged.brideFatherName!, brideBirthDate: merged.brideBirthDate!, bridePhone: merged.bridePhone!,
        witness1Nid: merged.witness1Nid!, witness1Name: merged.witness1Name!,
        witness2Nid: merged.witness2Nid!, witness2Name: merged.witness2Name!,
        waliName: merged.waliName, waliNid: merged.waliNid, waliPhone: merged.waliPhone,
        mahrAmount: merged.mahrAmount, mahrDescription: merged.mahrDescription,
        requestedOfficiant: merged.requestedOfficiant,
        venueType: merged.venueType!, province: merged.province!, district: merged.district!,
        mosqueId: merged.mosqueId, venueAddress: merged.venueAddress,
        preferredDateFrom: merged.preferredDateFrom!, preferredDateTo: merged.preferredDateTo,
        paymentMethod: merged.paymentMethod!,
      };

      let draft: MarriageApplication;
      if (draftId) {
        draft = await marriageApi.updateDraft(draftId, payload);
      } else {
        draft = await marriageApi.createDraft(payload);
        setDraftId(draft.id);
      }

      const docSlots: DocSlot[] = [
        merged.groomIdFile     && { file: merged.groomIdFile,     docType: 'groom_id'    as const },
        merged.brideIdFile     && { file: merged.brideIdFile,     docType: 'bride_id'    as const },
        merged.groomPhotoFile  && { file: merged.groomPhotoFile,  docType: 'groom_photo' as const },
        merged.bridePhotoFile  && { file: merged.bridePhotoFile,  docType: 'bride_photo' as const },
        merged.waliConsentFile && { file: merged.waliConsentFile, docType: 'wali_consent' as const },
        merged.portraitFile    && { file: merged.portraitFile,    docType: 'portrait'    as const },
      ].filter(Boolean) as DocSlot[];
      if (docSlots.length > 0) await uploadDocuments(draft.id, docSlots);

      if (merged.paymentMethod === 'momo') {
        if (IS_DEV) {
          // Dev shortcut: mark paid without MoMo, then submit and show success
          // (with the provisional-certificate download).
          await marriageApi.devCompletePayment(draft.id);
          const submitted = await marriageApi.submit(draft.id);
          clearPersistedState();
          setSubmittedApp(submitted);
          setIsSubmitting(false);
          return;
        }
        await marriageApi.initiateUserMomoPayment(draft.id, merged.mobilePhone!);
        updateData(merged);
        setPendingDraftApp(draft);
        setPaymentPhase('waiting');
        startPolling(draft.id);
        setIsSubmitting(false);
      } else {
        const submitted = await marriageApi.submit(draft.id);
        clearPersistedState();
        setSubmittedApp(submitted);
        setIsSubmitting(false);
      }
    } catch (err) {
      setSubmitError(extractMsg(err));
      setIsSubmitting(false);
    }
  }, [formData, draftId, startPolling, updateData]);

  const handleResend = useCallback(async () => {
    if (!pendingDraftApp || !formData.mobilePhone) return;
    setIsResending(true);
    try {
      await marriageApi.initiateUserMomoPayment(pendingDraftApp.id, formData.mobilePhone);
      // Restart polling against the new transaction
      startPolling(pendingDraftApp.id);
    } catch (err) {
      setSubmitError(extractMsg(err));
    } finally {
      setIsResending(false);
    }
  }, [pendingDraftApp, formData.mobilePhone, startPolling]);

  const handlePaymentConfirmed = useCallback(async () => {
    setPaymentPhase('idle');
    if (!pendingDraftApp) return;
    setIsSubmitting(true);
    try {
      // Fetch latest app in case stub was used after reload
      const freshApp = await marriageApi.getById(pendingDraftApp.id);
      const submitted = await marriageApi.submit(freshApp.id);
      clearPersistedState();
      setSubmittedApp(submitted);
    } catch (err) {
      setSubmitError(extractMsg(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingDraftApp]);

  const handleCancelPayment = useCallback(() => {
    stopPolling();
    setPaymentPhase('idle');
    setIsSubmitting(false);
    setSubmitError(null);
    // Keep draftId + formData so the user returns to Step 6 with data intact
    persist(6, formData, draftId, 'idle', null);
  }, [stopPolling, persist, formData, draftId]);

  const reset = useCallback(() => {
    stopPolling();
    clearPersistedState();
    setStep(1);
    setFormData({});
    setDraftId(null);
    setSubmittedApp(null);
    setSubmitError(null);
    setPendingDraftApp(null);
    setPaymentPhase('idle');
  }, [stopPolling]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Avoid SSR/hydration mismatch — render nothing until localStorage is read
  if (!hydrated) return null;

  if (submittedApp) return <SuccessScreen app={submittedApp} locale={locale} onReset={reset} />;

  if (paymentPhase === 'waiting' && pendingDraftApp) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-rose-500" />
        <PaymentWaitingScreen
          applicationNumber={pendingDraftApp.applicationNumber}
          phone={formData.mobilePhone ?? ''}
          amount={pendingDraftApp.amountDue}
          onCancel={handleCancelPayment}
          onResend={handleResend}
          isResending={isResending}
        />
      </div>
    );
  }

  const stepInfo = STEP_TITLES[step];

  return (
    <>
      {paymentPhase === 'confirmed' && pendingDraftApp && (
        <PaymentConfirmedPopup
          applicationNumber={pendingDraftApp.applicationNumber}
          onContinue={handlePaymentConfirmed}
        />
      )}

      <WizardLayout steps={STEPS} currentStep={step} title={stepInfo.title} subtitle={stepInfo.subtitle}>
        {submitError && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {step === 1 && <Step1Couple initialData={formData} onNext={handleStepComplete} />}
        {step === 2 && <Step2Ceremony initialData={formData} onNext={handleStepComplete} onBack={goBack} fees={fees} />}
        {step === 3 && (
          <Step3Witnesses
            initialData={formData}
            groomNid={formData.groomNid ?? ''}
            brideNid={formData.brideNid ?? ''}
            onNext={handleStepComplete}
            onBack={goBack}
          />
        )}
        {step === 4 && <Step4Mahr initialData={formData} onNext={handleStepComplete} onBack={goBack} />}
        {step === 5 && <Step5Documents initialData={formData} onNext={handleStepComplete} onBack={goBack} />}
        {step === 6 && (
          <Step6Payment
            formData={formData}
            onBack={goBack}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
            fees={fees}
          />
        )}
      </WizardLayout>
    </>
  );
}
