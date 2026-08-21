/**
 * Email bodies for the Hajj service. These are the *inner* HTML only — the
 * branded shell (header, gold accent, footer) is added by wrapEmailHtml().
 *
 * Email is a secondary channel: it is only sent when the applicant supplied an
 * address (the field is optional on the public form). SMS always goes out.
 */
import { HajjApplication } from './entities/hajj-application.entity';

const p = (text: string) => `<p>${text}</p>`;

/**
 * A muted reference box that survives a forward/print.
 *
 * ONE identifier reaches the applicant: `trackingCode`, always presented as
 * "Application number". A Hajj row also has `applicationNumber` — the sequential
 * RMC-HAJ-202607-00001 — but that stays internal (admin lists, exports). Showing
 * both is what previously had applicants typing the wrong one into the tracking
 * page and getting "not found". If you add a template here, use `trackingCode`.
 */
function refBox(value: string, label = 'Application number'): string {
  return `
    <div style="margin:18px 0;padding:14px 16px;background:#f4f6f5;border:1px solid #e8ebe9;border-radius:10px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">${label}</div>
      <div style="font-size:18px;font-weight:bold;color:#0d3d24;letter-spacing:.04em;">${value}</div>
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
        p('Keep this number safe — with your phone number it is how you check your status at any time.'),
    };
  },

  underReview(app: HajjApplication): { subject: string; html: string } {
    return {
      subject: `Hajj application ${app.trackingCode} is under review`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('Your Hajj application is now <strong>under review</strong>. Our team is verifying your passport details and payment proofs.') +
        refBox(app.trackingCode) +
        p('No action is needed from you right now. We will email and text you as soon as a decision is made.'),
    };
  },

  approved(app: HajjApplication): { subject: string; html: string } {
    return {
      subject: `Hajj application ${app.trackingCode} approved`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('We are pleased to inform you that your Hajj application has been <strong style="color:#1a7a4a;">APPROVED</strong>.') +
        refBox(app.trackingCode) +
        p('Our team will contact you shortly with the next steps regarding travel and preparation. Mabrook!'),
    };
  },

  /**
   * Something is outstanding. Unlike the other transitions this one asks the
   * applicant to act, so the ask is rendered prominently and the tracking code
   * is included — that plus their phone is how they reach the upload page.
   */
  moreInfoRequested(app: HajjApplication): { subject: string; html: string } {
    const ask = app.moreInfoRequested
      ? `<div style="margin:18px 0;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#92400e;">
           <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">What we still need</div>
           <div style="margin-top:4px;">${app.moreInfoRequested}</div>
         </div>`
      : '';
    return {
      subject: `Hajj application ${app.trackingCode} — more information needed`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('We have reviewed your Hajj application and need <strong>a little more from you</strong> before we can continue.') +
        ask +
        refBox(app.trackingCode) +
        p('Please upload what is listed above on the Hajj tracking page — enter this application number, confirm the code we text to the phone on your application, and you can add the document there.') +
        p('Your application stays open in the meantime; it returns to review as soon as you upload.'),
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
      subject: `Hajj application ${app.trackingCode} — decision`,
      html:
        p(`Assalamu alaikum ${app.fullName},`) +
        p('After review, your Hajj application has <strong style="color:#b91c1c;">not been approved</strong>.') +
        refBox(app.trackingCode) +
        reason +
        p('If you believe this was in error, or you would like guidance on reapplying, please contact the Hajj desk and quote your application number.'),
    };
  },
};
