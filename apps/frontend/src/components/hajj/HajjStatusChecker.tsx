'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Clock, FileText, AlertCircle, Upload, Loader2 } from 'lucide-react';
import {
  hajjApi,
  HAJJ_DOCUMENT_LABELS,
  HAJJ_PROOF_ACCEPT,
  HAJJ_PROOF_MAX_BYTES,
  type HajjApplicationPublic,
  type HajjDocumentType,
  type HajjStatus,
  type UploadedProof,
} from '@/lib/hajjApi';
import { cn } from '@/lib/utils';
import { FilePreviewTrigger } from '@/components/ui/FilePreviewOverlay';
import { TrackByOtp, type TrackedSession } from '@/components/services/shared/TrackByOtp';

/**
 * The happy path, in order. `rejected` is a terminal branch off `under_review`,
 * and `more_info_requested` is a pause on it — both render their own panel
 * instead of a step, so neither belongs in this list.
 */
const TIMELINE: Exclude<HajjStatus, 'rejected' | 'more_info_requested'>[] = [
  'submitted',
  'under_review',
  'approved',
];

const STEP_ICON = {
  submitted: FileText,
  under_review: Clock,
  more_info_requested: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

export function HajjStatusChecker() {
  const t = useTranslations('services.hajj.status');
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hajj accepts the application number as well as the tracking code, so it
          overrides the shared wording — which speaks only of a tracking code. */}
      <TrackByOtp<HajjApplicationPublic>
        basePath="/hajj/applications/track"
        accent="green"
        codePlaceholder={t('codePlaceholder')}
        codeHint={t('codeHint')}
      >
        {(app, _reset, session) => <HajjResult app={app} session={session} />}
      </TrackByOtp>
    </div>
  );
}

function HajjResult({ app, session }: { app: HajjApplicationPublic; session: TrackedSession }) {
  const t = useTranslations('services.hajj.status');
  const rejected = app.status === 'rejected';
  const needsInfo = app.status === 'more_info_requested';
  const reachedIndex = TIMELINE.indexOf(app.status as (typeof TIMELINE)[number]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <p className="text-lg font-bold tracking-wide text-rmc-green">{app.trackingCode}</p>
        <p className="mt-0.5 text-sm text-gray-600">
          {t('applicant')}: <span className="font-medium text-gray-900">{app.fullName}</span>
        </p>
      </div>

      <div className="px-5 py-6">
        {rejected ? (
          <RejectedPanel app={app} />
        ) : needsInfo ? (
          <MoreInfoPanel app={app} session={session} />
        ) : (
          <ol className="space-y-5">
            {TIMELINE.map((step, i) => {
              const done = i <= reachedIndex;
              const current = i === reachedIndex;
              const Icon = STEP_ICON[step];
              return (
                <li key={step} className="flex gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1',
                      done ? 'bg-rmc-green text-white ring-rmc-green/20' : 'bg-gray-50 text-gray-300 ring-gray-200',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="pt-1">
                    <p className={cn('text-sm font-semibold', done ? 'text-gray-900' : 'text-gray-400')}>
                      {t(`steps.${step}`)}
                    </p>
                    {current && <p className="mt-1 text-xs leading-relaxed text-gray-500">{t(`stepHint.${step}`)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50/40 px-5 py-3 text-xs text-gray-500">
        <p>
          {t('submittedOn')}: <span className="font-medium text-gray-700">{new Date(app.submittedAt).toLocaleDateString()}</span>
        </p>
        <p className="text-right">
          {t('lastUpdate')}: <span className="font-medium text-gray-700">{new Date(app.updatedAt).toLocaleDateString()}</span>
        </p>
      </div>
    </div>
  );
}

/** Mirrors the backend allow-list so a wrong type is caught before the upload. */
const HAJJ_ACCEPTED_TYPES = new Set(HAJJ_PROOF_ACCEPT.split(','));

function axiosStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

function axiosErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
}

/**
 * The one status the applicant can act on: shows exactly what the reviewer asked
 * for, and lets them upload it without logging in — the OTP session they already
 * passed is the credential.
 *
 * An admin can ask for more than one receipt, so both slots are offered at once
 * and sent together: the application returns to review only after the whole batch
 * is in, never stranding the applicant after the first file. Uploading returns it
 * to review, so the panel disappears on refresh.
 */
function MoreInfoPanel({
  app,
  session,
}: {
  app: HajjApplicationPublic;
  session: TrackedSession;
}) {
  const t = useTranslations('services.hajj.status');
  const inputRef = useRef<HTMLInputElement>(null);
  // Which slot the hidden picker is filling — one input serves every row.
  const pickingFor = useRef<HajjDocumentType | null>(null);
  const [files, setFiles] = useState<Partial<Record<HajjDocumentType, File>>>({});
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'sending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const chosen = Object.entries(files) as [HajjDocumentType, File][];

  // The admin may have named exactly which receipt(s) they need — show only those
  // slots. A null/empty list is a legacy ask: offer both, as before. When the set
  // is named, every one of them must be attached before it can be sent, matching
  // the backend which won't return the application to review until the ask is met.
  const allTypes = Object.keys(HAJJ_DOCUMENT_LABELS) as HajjDocumentType[];
  const requestedTypes =
    app.moreInfoDocumentTypes && app.moreInfoDocumentTypes.length
      ? app.moreInfoDocumentTypes
      : null;
  const slots = requestedTypes ?? allTypes;
  const canSend = requestedTypes ? requestedTypes.every((tp) => files[tp]) : chosen.length > 0;

  const openPicker = (type: HajjDocumentType) => {
    pickingFor.current = type;
    inputRef.current?.click();
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = pickingFor.current;
    const file = e.target.files?.[0] ?? null;
    e.target.value = ''; // allow re-picking the same file after an error
    pickingFor.current = null;
    setError(null);
    if (!type || !file) return;
    if (file.size > HAJJ_PROOF_MAX_BYTES) {
      setError(t('upload.tooLarge'));
      return;
    }
    // Empty type happens for some HEIC pickers — let the server be the judge then.
    if (file.type && !HAJJ_ACCEPTED_TYPES.has(file.type)) {
      setError(t('upload.wrongType'));
      return;
    }
    setFiles((prev) => ({ ...prev, [type]: file }));
  };

  const removeFile = (type: HajjDocumentType) =>
    setFiles((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });

  const submit = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Two steps, reported separately: the bytes go through the same validated
      // public upload the original application used (file-shaped failures land
      // here), then the returned keys are attached in one batch (session/status
      // failures land there) — so the applicant gets the RIGHT message for what
      // actually went wrong instead of a blanket "upload failed".
      setStage('uploading');
      const uploaded: (UploadedProof & { documentType: HajjDocumentType })[] = [];
      try {
        for (const [type, file] of chosen) {
          const up = await hajjApi.uploadProof(file);
          uploaded.push({ ...up, documentType: type });
        }
      } catch (err) {
        const s = axiosStatus(err);
        setError(s === 413 ? t('upload.tooLarge') : s === 400 ? t('upload.wrongType') : t('upload.failed'));
        return;
      }

      setStage('sending');
      try {
        await hajjApi.resubmitDocuments(session.token, uploaded);
      } catch (err) {
        const s = axiosStatus(err);
        const code = axiosErrorCode(err);
        setError(
          s === 401 || code === 'TRACKING_SESSION_INVALID'
            ? t('upload.sessionExpired')
            : code === 'HAJJ_NOT_AWAITING_DOCS'
              ? t('upload.notAwaiting')
              : t('upload.failed'),
        );
        return;
      }

      setDone(true);
      await session.refresh();
    } finally {
      setBusy(false);
      setStage('idle');
    }
  };

  if (done) {
    return (
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="pt-1">
          <p className="text-sm font-semibold text-gray-900">{t('upload.sentTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('upload.sentHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-semibold text-gray-900">{t('steps.more_info_requested')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          {t('stepHint.more_info_requested')}
        </p>

        {app.moreInfoRequested && (
          <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
              {t('upload.requested')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">{app.moreInfoRequested}</p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* One row per requested receipt — the applicant attaches what the
              reviewer named; all go up together on Send. */}
          {slots.map((type) => {
            const file = files[type];
            return (
              <div key={type} className="rounded-xl border border-gray-200 px-3 py-2.5">
                <p className="mb-1.5 text-xs font-semibold text-gray-700">{HAJJ_DOCUMENT_LABELS[type]}</p>
                {file ? (
                  <div className="flex items-center gap-2">
                    {/* Same preview affordance as the application form — the
                        applicant can confirm the right page before sending it. */}
                    <FilePreviewTrigger file={file} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm text-gray-700">{file.name}</span>
                    </FilePreviewTrigger>
                    <button
                      type="button"
                      onClick={() => removeFile(type)}
                      disabled={busy}
                      className="shrink-0 text-xs font-medium text-gray-400 transition-colors hover:text-red-600 disabled:opacity-60"
                    >
                      {t('upload.remove')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openPicker(type)}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {t('upload.choose')}
                  </button>
                )}
              </div>
            );
          })}

          <input
            ref={inputRef}
            type="file"
            accept={HAJJ_PROOF_ACCEPT}
            className="hidden"
            onChange={pick}
          />

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!canSend || busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {stage === 'uploading' ? t('upload.uploading') : t('upload.sending')}
              </>
            ) : (
              t('upload.send')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectedPanel({ app }: { app: HajjApplicationPublic }) {
  const t = useTranslations('services.hajj.status');
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
        <XCircle className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="pt-1">
        <p className="text-sm font-semibold text-gray-900">{t('steps.rejected')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('stepHint.rejected')}</p>
        {app.rejectionReason && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-600">{t('reason')}</p>
            <p className="mt-1 text-sm leading-relaxed text-red-600">{app.rejectionReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
