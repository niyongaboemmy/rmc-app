/**
 * Centralised SMS templates for the Marriage service.
 *
 * Rules:
 *  - Max 160 chars per message (single SMS frame — no multipart cost).
 *  - Show only the essential: app number, names/status, next step.
 *  - Start every message with "RMC Nikah" for brand recognition.
 */
export const SmsTemplates = {
  /** Sent immediately after a new application is submitted. */
  submission(appNo: string, groomName: string, brideName: string): string {
    return `RMC Nikah | App ${appNo}: ${groomName} & ${brideName} received. Under review shortly. Track at rwandamuslim.org`;
  },

  /** Sent when the application moves to "under review". */
  underReview(appNo: string): string {
    return `RMC Nikah | App ${appNo}: Now under review. We will notify you of any update.`;
  },

  /** Sent when the application is approved. */
  approved(appNo: string): string {
    return `RMC Nikah | App ${appNo}: APPROVED. Our team will confirm your ceremony date soon. Mabrook!`;
  },

  /** Sent when the application is rejected. */
  rejected(appNo: string, reason?: string | null): string {
    const suffix = reason
      ? ` Reason: ${reason.slice(0, 60)}`
      : ' Contact nikah@rmc.rw for details.';
    return `RMC Nikah | App ${appNo}: NOT APPROVED.${suffix}`;
  },

  /** Sent when amendments are requested. */
  amendmentsRequested(appNo: string, notes?: string | null): string {
    const suffix = notes ? ` Note: ${notes.slice(0, 70)}` : ' Log in to update your application.';
    return `RMC Nikah | App ${appNo}: Amendments required.${suffix}`;
  },

  /** Sent when the ceremony is marked complete. */
  completed(appNo: string): string {
    return `RMC Nikah | App ${appNo}: Ceremony complete. Certificate will be issued shortly. Mabrook!`;
  },

  /** Sent when the certificate is ready and the case is closed. */
  closed(appNo: string): string {
    return `RMC Nikah | App ${appNo}: Certificate ready. Download at rwandamuslim.org`;
  },

  /** Sent when a ceremony date is confirmed. */
  ceremonyScheduled(appNo: string, date: string): string {
    return `RMC Nikah | App ${appNo}: Ceremony confirmed — ${date}. Assalamu Alaikum!`;
  },

  /** Sent after payment is received for an application. */
  paymentConfirmed(appNo: string, amount: string): string {
    return `RMC Nikah | App ${appNo}: Payment of ${amount} RWF received. Application now being processed.`;
  },

  /** Sent to a witness / party member asking them to confirm participation. */
  partyConfirmation(appNo: string, role: string, confirmLink: string): string {
    return `RMC Nikah | App ${appNo}: You are listed as ${role}. Confirm: ${confirmLink}`;
  },
} as const;
