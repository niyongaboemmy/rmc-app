/**
 * Centralised SMS templates for the Hajj service.
 *
 * Rules (mirrors marriage/sms-templates.ts):
 *  - Max 160 chars per message (single SMS frame — no multipart cost).
 *  - Show only the essential: app number, status, next step.
 *  - Start every message with "RMC Hajj" for brand recognition.
 */
export const HajjSmsTemplates = {
  /** Sent immediately after an application is submitted. */
  submission(appNo: string): string {
    return `RMC Hajj | App ${appNo} received. We will review it and keep you updated. Track it at rwandamuslim.org`;
  },

  /** Sent when an admin starts verifying the application. */
  underReview(appNo: string): string {
    return `RMC Hajj | App ${appNo}: now under review by our team. We will notify you of the final decision.`;
  },

  /** Final decision — approved. */
  approved(appNo: string): string {
    return `RMC Hajj | App ${appNo}: APPROVED. Our team will contact you with the next steps. Mabrook!`;
  },

  /** Final decision — rejected. The reason always travels with it. */
  rejected(appNo: string, reason?: string | null): string {
    const suffix = reason
      ? ` Reason: ${reason.slice(0, 60)}`
      : ' Contact hajj@rmc.rw for details.';
    return `RMC Hajj | App ${appNo}: NOT APPROVED.${suffix}`;
  },
};
