/**
 * Centralised SMS templates for the Tender bid service.
 *
 * Rules (same as the Good Conduct service):
 *  - Max 160 chars per message (single SMS frame — no multipart cost).
 *  - Show only the essential: application reference, status, next step.
 *  - Start every message with "RMC Tender" for brand recognition.
 *  - English only — SMS is not localized.
 *
 * `ref` is the human-readable `application_number` (RMC-TND-YYYYMM-00001),
 * allocated at submission — unlike Good Conduct, which has no friendly
 * identifier until the certificate is issued.
 */
export const SmsTemplates = {
  submission(ref: string, trackingCode: string, tenderTitle: string): string {
    return `RMC Tender | Bid ${ref} received for "${tenderTitle.slice(0, 35)}". Track code: ${trackingCode} at rwandamuslim.org`;
  },

  underReview(ref: string): string {
    return `RMC Tender | Bid ${ref}: Now under evaluation. We will notify you of any update.`;
  },

  moreInfoRequested(ref: string, notes?: string | null): string {
    const suffix = notes ? ` Note: ${notes.slice(0, 70)}` : ' Log in to update your bid.';
    return `RMC Tender | Bid ${ref}: More info needed.${suffix}`;
  },

  shortlisted(ref: string): string {
    return `RMC Tender | Bid ${ref}: SHORTLISTED. You have passed evaluation. Await the award decision.`;
  },

  awarded(ref: string): string {
    return `RMC Tender | Bid ${ref}: AWARDED. Congratulations. RMC will contact you to sign the contract.`;
  },

  rejected(ref: string, reason?: string | null): string {
    const suffix = reason ? ` Reason: ${reason.slice(0, 60)}` : ' Contact info@rmc.rw for details.';
    return `RMC Tender | Bid ${ref}: NOT SUCCESSFUL.${suffix}`;
  },
} as const;
