/**
 * The shared, branded email shell used for every outbound RMC email.
 *
 * Table layout + inline styles, because Outlook/Gmail ignore <style> blocks and
 * modern CSS. The logo is a PNG — many email clients still don't render WebP.
 *
 * Extracted from SubscribersService so service modules (Hajj, …) can send mail
 * that looks identical to the subscriber broadcasts.
 */

export interface EmailShellOptions {
  /** Absolute base URL of the frontend — used for the logo and to absolutize links. */
  appUrl: string;
  /** Footer HTML (e.g. a per-recipient unsubscribe line). Falls back to a generic notice. */
  footerNote?: string;
}

/**
 * Rewrite root-relative links/images (href="/..", src="/..") to absolute URLs.
 * Email clients have no page origin, so a relative link is dead in the inbox.
 * Skips protocol-relative ("//cdn.."), anchors ("#..") and already-absolute URLs.
 */
export function absolutizeLinks(html: string, baseUrl: string): string {
  return html.replace(
    /(\b(?:href|src)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi,
    (_m, attr: string, quote: string, path: string) => `${attr}${quote}${baseUrl}${path}${quote}`,
  );
}

export function wrapEmailHtml(bodyHtml: string, opts: EmailShellOptions): string {
  const url = opts.appUrl;
  const body = absolutizeLinks(bodyHtml, url);
  const year = new Date().getFullYear();
  const sans = 'Arial,Helvetica,sans-serif';
  const footerNote =
    opts.footerNote ?? 'You received this message from the Rwanda Muslim Community.';

  return `
      <div style="margin:0;padding:0;background:#f4f6f5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f5;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e8ebe9;border-radius:14px;overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background-color:#0d3d24;background-image:linear-gradient(135deg,#0d3d24 0%,#1a7a4a 100%);padding:22px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:14px;">
                          <img src="${url}/logo.png" width="44" height="44" alt="RMC" style="display:block;border:0;outline:none;border-radius:8px;background:#ffffff;" />
                        </td>
                        <td valign="middle">
                          <div style="color:#ffffff;font-family:${sans};font-size:18px;font-weight:bold;line-height:1.2;">Rwanda Muslim Community</div>
                          <div style="color:#cfe6da;font-family:${sans};font-size:12px;line-height:1.4;letter-spacing:.3px;">Umuryango w'Abayisilamu mu Rwanda</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Gold accent -->
                <tr><td style="height:4px;line-height:4px;font-size:0;background:#d4a017;">&nbsp;</td></tr>
                <!-- Body -->
                <tr>
                  <td style="padding:28px;color:#1f2937;font-family:${sans};font-size:15px;line-height:1.65;">
                    ${body}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:20px 28px;background:#fafbfa;border-top:1px solid #eef0ee;">
                    <div style="color:#6b7280;font-family:${sans};font-size:12px;line-height:1.6;">
                      ${footerNote}
                    </div>
                    <div style="margin-top:10px;color:#9ca3af;font-family:${sans};font-size:11px;line-height:1.5;">
                      &copy; ${year} Rwanda Muslim Community &middot;
                      <a href="${url}" style="color:#1a7a4a;text-decoration:none;">Visit our website</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`;
}
