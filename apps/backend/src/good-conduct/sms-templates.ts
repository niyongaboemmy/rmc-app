/**
 * Centralised SMS templates for the Good Conduct Certificate service.
 *
 * Rules:
 *  - Max 160 chars per message (single SMS frame — no multipart cost).
 *  - Show only the essential: request reference, status, next step.
 *  - Start every message with "RMC Good Conduct" for brand recognition.
 *  - English only for now — SMS is not localized per plan §12/§3 (Phase 1).
 *
 * `ref` is a short reference code (see GoodConductService.shortRef), not the
 * full request UUID — unlike marriage's application_number, this service has
 * no human-readable identifier until certificate_number is allocated on
 * approval, so a truncated id stands in for pre-certificate notifications.
 */
export const SmsTemplates = {
  /** Sent when the request advances from draft to submitted (payment confirmed). */
  submission(ref: string): string {
    return `RMC Good Conduct | Request ${ref} received. Under review shortly. Track at rwandamuslim.org`;
  },

  /** Sent after payment is received for a request. */
  paymentConfirmed(ref: string, amount: string): string {
    return `RMC Good Conduct | Request ${ref}: Payment of ${amount} RWF received. Now being processed.`;
  },

  /** Sent when the request moves to "under review". */
  underReview(ref: string): string {
    return `RMC Good Conduct | Request ${ref}: Now under review. We will notify you of any update.`;
  },

  /** Sent when the reviewer requests more information from the applicant. */
  moreInfoRequested(ref: string, notes?: string | null): string {
    const suffix = notes ? ` Note: ${notes.slice(0, 70)}` : ' Log in to update your request.';
    return `RMC Good Conduct | Request ${ref}: More info needed.${suffix}`;
  },

  /** Sent when the request is approved. */
  approved(ref: string): string {
    return `RMC Good Conduct | Request ${ref}: APPROVED. Your certificate is being prepared.`;
  },

  /** Sent when the request is rejected. */
  rejected(ref: string, reason?: string | null): string {
    const suffix = reason ? ` Reason: ${reason.slice(0, 60)}` : ' Contact info@rmc.rw for details.';
    return `RMC Good Conduct | Request ${ref}: NOT APPROVED.${suffix}`;
  },

  /** Sent when the certificate is issued and ready to download/verify. */
  certificateReady(ref: string): string {
    return `RMC Good Conduct | Request ${ref}: Certificate ready. Download at rwandamuslim.org`;
  },
} as const;
