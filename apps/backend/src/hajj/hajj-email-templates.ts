/**
 * Email bodies for the Hajj service. These are the *inner* HTML only — the
 * branded shell (header, gold accent, footer) is added by wrapEmailHtml().
 *
 * Email is a secondary channel: it is only sent when the applicant supplied an
 * address (the field is optional on the public form). SMS always goes out.
 */
import { HajjApplication } from './entities/hajj-application.entity';

const p = (text: string) => `<p>${text}</p>`;

/** A muted box showing the application number so it survives a forward/print. */
function refBox(appNo: string): string {
  return `
    <div style="margin:18px 0;padding:14px 16px;background:#f4f6f5;border:1px solid #e8ebe9;border-radius:10px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Application number</div>
      <div style="font-size:18px;font-weight:bold;color:#0d3d24;letter-spacing:.04em;">${appNo}</div>
    </div>`;
}

export const HajjEmailTemplates = {
  submission(app: HajjApplication): { subject: string; html: string } {
    return {
      subject: `Hajj application ${app.trackingCode} received`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('We have received your Hajj application. Our team will verify your details and payment proofs, and you will be notified at every step until a final decision is made.') +
        refBox(app.trackingCode) +
        p('Keep this tracking code safe — with your phone number you can use it to check your status at any time.'),
    };
  },

  underReview(app: HajjApplication): { subject: string; html: string } {
    return {
      subject: `Hajj application ${app.applicationNumber} is under review`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('Your Hajj application is now <strong>under review</strong>. Our team is verifying your passport details and payment proofs.') +
        refBox(app.applicationNumber) +
        p('No action is needed from you right now. We will email and text you as soon as a decision is made.'),
    };
  },

  approved(app: HajjApplication): { subject: string; html: string } {
    return {
      subject: `Hajj application ${app.applicationNumber} approved`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('We are pleased to inform you that your Hajj application has been <strong style="color:#1a7a4a;">APPROVED</strong>.') +
        refBox(app.applicationNumber) +
        p('Our team will contact you shortly with the next steps regarding travel and preparation. Mabrook!'),
    };
  },

  rejected(app: HajjApplication): { subject: string; html: string } {
    const reason = app.rejectionReason
      ? `<div style="margin:18px 0;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#991b1b;">
           <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Reason</div>
           <div style="margin-top:4px;">${app.rejectionReason}</div>
         </div>`
      : '';
    return {
      subject: `Hajj application ${app.applicationNumber} — decision`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('After review, your Hajj application has <strong style="color:#b91c1c;">not been approved</strong>.') +
        refBox(app.applicationNumber) +
        reason +
        p('If you believe this was in error, or you would like guidance on reapplying, please contact the Hajj desk and quote your application number.'),
    };
  },
};
