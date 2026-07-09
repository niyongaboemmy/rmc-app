/**
 * Centralised email templates for the Good Conduct Certificate service —
 * the branded HTML counterpart to `sms-templates.ts`. Sent alongside SMS at
 * every status change (when the applicant supplied an email; it's optional
 * on the request form) and independently toggleable per event in
 * /admin/settings, same as SMS.
 */

const GREEN_DARK = '#0d3d24';
const GREEN = '#1a7a4a';
const SANS = 'Arial,Helvetica,sans-serif';

/** Branded card wrapper shared by every Good Conduct email. */
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
                  <div style="color:#cfe6da;font-family:${SANS};font-size:12px;">Good Conduct Certificate Service</div>
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

function refLine(ref: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#666;">Request reference: <strong style="color:${GREEN_DARK};">${ref}</strong></p>`;
}

export const EmailTemplates = {
  submission(fullNames: string, ref: string): { subject: string; html: string } {
    return {
      subject: `Good Conduct request received — ${ref}`,
      html: wrap(
        'Request Received',
        p(`Dear ${fullNames},`) +
          p(
            'Your Good Conduct Certificate request has been received and payment confirmed. It will be reviewed shortly.',
          ) +
          refLine(ref),
      ),
    };
  },

  paymentConfirmed(
    fullNames: string,
    ref: string,
    amount: string,
  ): { subject: string; html: string } {
    return {
      subject: `Payment received — ${ref}`,
      html: wrap(
        'Payment Received',
        p(`Dear ${fullNames},`) +
          p(
            `We have received your payment of <strong>${amount} RWF</strong>. Your request is now being processed.`,
          ) +
          refLine(ref),
      ),
    };
  },

  underReview(fullNames: string, ref: string): { subject: string; html: string } {
    return {
      subject: `Request under review — ${ref}`,
      html: wrap(
        'Under Review',
        p(`Dear ${fullNames},`) +
          p(
            'Your Good Conduct Certificate request is now under review. We will notify you as soon as there is an update.',
          ) +
          refLine(ref),
      ),
    };
  },

  moreInfoRequested(
    fullNames: string,
    ref: string,
    notes?: string | null,
  ): { subject: string; html: string } {
    return {
      subject: `More information needed — ${ref}`,
      html: wrap(
        'More Information Needed',
        p(`Dear ${fullNames},`) +
          p('A reviewer needs more information before your request can proceed.') +
          (notes
            ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fff8e6;border:1px solid #f2dfa4;border-radius:8px;font-size:13px;">${notes}</div>`
            : '') +
          p('Please log in to your RMC account to update your request.') +
          refLine(ref),
      ),
    };
  },

  approved(fullNames: string, ref: string): { subject: string; html: string } {
    return {
      subject: `Request approved — ${ref}`,
      html: wrap(
        'Request Approved',
        p(`Dear ${fullNames},`) +
          p(
            'Congratulations — your Good Conduct Certificate request has been <strong>approved</strong>. Your certificate is now being prepared.',
          ) +
          refLine(ref),
      ),
    };
  },

  rejected(
    fullNames: string,
    ref: string,
    reason?: string | null,
  ): { subject: string; html: string } {
    return {
      subject: `Request not approved — ${ref}`,
      html: wrap(
        'Request Not Approved',
        p(`Dear ${fullNames},`) +
          p('Unfortunately your Good Conduct Certificate request was not approved.') +
          (reason
            ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fdeceb;border:1px solid #f3c6c2;border-radius:8px;font-size:13px;">${reason}</div>`
            : '<p style="margin:0 0 16px;font-size:13px;color:#666;">Contact info@rmc.rw for details.</p>') +
          refLine(ref),
      ),
    };
  },

  certificateReady(fullNames: string, ref: string): { subject: string; html: string } {
    return {
      subject: `Your certificate is ready — ${ref}`,
      html: wrap(
        'Certificate Ready',
        p(`Dear ${fullNames},`) +
          p('Your Good Conduct Certificate has been issued and is ready to download and verify.') +
          p('Log in to your RMC account and open Track Your Request to download it.') +
          refLine(ref),
      ),
    };
  },
} as const;
