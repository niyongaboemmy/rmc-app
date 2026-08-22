'use client';

import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';

/**
 * The documents a reviewer asked this applicant to upload.
 *
 * Read-only. It renders the checklist stored alongside the reviewer's message so the
 * request arrives as a list rather than as prose the applicant has to parse — "please
 * send your CV and a criminal record" is easy to half-read, two ticked lines are not.
 *
 * ── Labels come from the apply form, not the admin catalogue ────────────────────────
 *
 * `REQUESTABLE_JOB_DOCUMENTS` in lib/jobWorkflow.ts carries English labels, which is fine
 * where it is used — the admin UI is English-only. This is applicant-facing and therefore
 * tri-lingual, so each key maps to the string the APPLY FORM already uses for that same
 * document. An applicant is then asked for the document under the exact name they
 * uploaded it by, in their own language.
 */

/** Requested-document key → its key under `services.jobs.apply`. */
const APPLY_LABEL_KEYS: Record<string, string> = {
  applicationLetter: 'applicationLetter',
  cv: 'cv',
  nationalId: 'nationalId',
  criminalRecord: 'criminalRecord',
  academicPapers: 'academicPapers',
  // The apply form calls this one `goodConductFile` — it is the upload option, as opposed
  // to `goodConductNumber`, which verifies an existing certificate instead.
  goodConductCertificate: 'goodConductFile',
  employerRecommendation: 'employerRecommendation',
};

export function RequestedDocuments({ documents }: { documents?: string[] | null }) {
  const t = useTranslations('services.jobs.status');
  const tApply = useTranslations('services.jobs.apply');

  if (!documents?.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-bold text-amber-900">{t('requestedDocsTitle')}</p>
      <ul className="mt-2 space-y-1.5">
        {documents.map((key) => (
          <li key={key} className="flex items-start gap-2 text-xs text-amber-900/90">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            {/* `other` has no slot on the application, so it has no apply-form label —
                it points the reader back at the reviewer's message instead. An unknown
                key falls through the same way rather than rendering a raw identifier. */}
            <span>
              {APPLY_LABEL_KEYS[key] ? tApply(APPLY_LABEL_KEYS[key]) : t('requestedDocsOther')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
