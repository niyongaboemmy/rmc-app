/**
 * Centralised email templates for the Tender bid service — the branded HTML
 * counterpart to `sms-templates.ts`. Structure mirrors
 * good-conduct/email-templates.ts; only the sub-brand line and copy differ.
 *
 * Both channels are enabled by default for tenders (migration 036): bidders are
 * companies, and email is the norm for procurement correspondence.
 */

const GREEN_DARK = '#0d3d24';
const GREEN = '#1a7a4a';
const TEAL = '#0f766e';
const SANS = 'Arial,Helvetica,sans-serif';

/** Branded card wrapper shared by every tender email. */
function wrap(title: string, bodyHtml: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="margin:0;padding:0;background:#f4f6f5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f5;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e8ebe9;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="background-color:${GREEN_DARK};background-image:linear-gradient(135deg,${GREEN_DARK} 0%,${GREEN} 100%);padding:22px 28px;">
                  <div style="color:#ffffff;font-family:${SANS};font-size:17px;font-weight:bold;">Rwanda Muslim Community</div>
                  <div style="color:#cfe6da;font-family:${SANS};font-size:12px;">Tenders &amp; Procurement</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;font-family:${SANS};color:#222;">
                  <h2 style="margin:0 0 14px;font-size:18px;color:${GREEN_DARK};">${title}</h2>
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px;background:#f7f9f8;border-top:1px solid #e8ebe9;font-family:${SANS};font-size:11px;color:#8a908c;">
                  &copy; ${year} Rwanda Muslim Community. This is an automated message — please do not reply.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${text}</p>`;
}

function refLine(ref: string, tenderTitle?: string): string {
  const tender = tenderTitle
    ? `<br/>Tender: <strong style="color:${GREEN_DARK};">${tenderTitle}</strong>`
    : '';
  return `<p style="margin:0 0 16px;font-size:13px;color:#666;">Application reference: <strong style="color:${TEAL};">${ref}</strong>${tender}</p>`;
}

export const EmailTemplates = {
  submission(
    company: string,
    ref: string,
    trackingCode: string,
    tenderTitle: string,
  ): { subject: string; html: string } {
    return {
      subject: `Bid received — ${ref}`,
      html: wrap(
        'Bid Received',
        p(`Dear ${company},`) +
          p(
            'Your tender application has been received. It will be evaluated after the submission deadline closes, and you will be notified of the outcome.',
          ) +
          refLine(ref, tenderTitle) +
          p(
            `To check your status without signing in, use your tracking code <strong>${trackingCode}</strong> on the tenders page — keep it safe.`,
          ),
      ),
    };
  },

  underReview(
    company: string,
    ref: string,
    tenderTitle: string,
  ): { subject: string; html: string } {
    return {
      subject: `Bid under evaluation — ${ref}`,
      html: wrap(
        'Bid Under Evaluation',
        p(`Dear ${company},`) +
          p('Your bid is now being evaluated by the committee. No action is needed from you.') +
          refLine(ref, tenderTitle),
      ),
    };
  },

  moreInfoRequested(
    company: string,
    ref: string,
    tenderTitle: string,
    notes?: string | null,
  ): { subject: string; html: string } {
    return {
      subject: `More information needed — ${ref}`,
      html: wrap(
        'More Information Requested',
        p(`Dear ${company},`) +
          p(
            'The evaluation committee needs more information before it can proceed with your bid.',
          ) +
          (notes ? p(`<strong>Note from the reviewer:</strong> ${notes}`) : '') +
          p('Please log in to update your application.') +
          refLine(ref, tenderTitle),
      ),
    };
  },

  shortlisted(
    company: string,
    ref: string,
    tenderTitle: string,
  ): { subject: string; html: string } {
    return {
      subject: `Bid shortlisted — ${ref}`,
      html: wrap(
        'Bid Shortlisted',
        p(`Dear ${company},`) +
          p(
            'Your bid has passed evaluation and has been shortlisted. The award decision will follow shortly.',
          ) +
          refLine(ref, tenderTitle),
      ),
    };
  },

  awarded(company: string, ref: string, tenderTitle: string): { subject: string; html: string } {
    return {
      subject: `Tender awarded — ${ref}`,
      html: wrap(
        'Tender Awarded',
        p(`Dear ${company},`) +
          p(
            'Congratulations — this tender has been awarded to you. RMC will contact you shortly regarding the contract.',
          ) +
          refLine(ref, tenderTitle),
      ),
    };
  },

  rejected(
    company: string,
    ref: string,
    tenderTitle: string,
    reason?: string | null,
  ): { subject: string; html: string } {
    return {
      subject: `Bid outcome — ${ref}`,
      html: wrap(
        'Bid Not Successful',
        p(`Dear ${company},`) +
          p('Thank you for bidding. On this occasion your application was not successful.') +
          (reason ? p(`<strong>Reason:</strong> ${reason}`) : '') +
          p('We encourage you to apply for future tenders.') +
          refLine(ref, tenderTitle),
      ),
    };
  },
} as const;
