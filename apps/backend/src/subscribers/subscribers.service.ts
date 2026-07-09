import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import { Subscriber } from './entities/subscriber.entity';
import { CreateSubscriberDto, BroadcastDto } from './dto/subscriber.dto';
import { EmailService } from '../integrations/email/email.service';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(
    @InjectRepository(Subscriber)
    private readonly subscribers: Repository<Subscriber>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Base URL used for every link in outgoing email (logo, unsubscribe, website).
   * Reads FRONTEND_URL; when unset the fallback is the LIVE domain — never
   * localhost — so a broadcast from a misconfigured server can't ship dead
   * localhost links to real subscribers. Local dev sets FRONTEND_URL in .env.
   */
  private get appUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'https://isengesho.com';
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  /** Subscribe an email (idempotent). Reactivates a previously-unsubscribed address. */
  async subscribe(dto: CreateSubscriberDto): Promise<{ subscribed: true }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.subscribers
      .createQueryBuilder('s')
      .where('LOWER(s.email) = :email', { email })
      .getOne();

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.locale = dto.locale ?? existing.locale;
        await this.subscribers.save(existing);
        this.sendWelcome(existing).catch(() => undefined);
      }
      return { subscribed: true };
    }

    const sub = this.subscribers.create({
      email,
      locale: dto.locale ?? 'en',
      source: dto.source ?? null,
      isActive: true,
    });
    const saved = await this.subscribers.save(sub);
    this.sendWelcome(saved).catch(() => undefined);
    return { subscribed: true };
  }

  /** One-click unsubscribe via the token embedded in every email. */
  async unsubscribe(token: string): Promise<{ unsubscribed: boolean }> {
    const sub = await this.subscribers.findOne({ where: { unsubscribeToken: token } });
    if (!sub) return { unsubscribed: false };
    if (sub.isActive) {
      sub.isActive = false;
      await this.subscribers.save(sub);
    }
    return { unsubscribed: true };
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminList(): Promise<{ items: Subscriber[]; total: number; active: number }> {
    const items = await this.subscribers.find({ order: { createdAt: 'DESC' } });
    const active = items.filter((s) => s.isActive).length;
    return { items, total: items.length, active };
  }

  async adminRemove(id: string): Promise<{ id: string }> {
    const sub = await this.subscribers.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscriber not found');
    await this.subscribers.remove(sub);
    return { id };
  }

  /** Send a broadcast to every active subscriber. Returns how many succeeded/failed. */
  async broadcast(dto: BroadcastDto): Promise<{ sent: number; failed: number; total: number }> {
    const active = await this.subscribers.find({ where: { isActive: true } });
    let sent = 0;
    let failed = 0;

    await Promise.all(
      active.map(async (sub) => {
        try {
          await this.email.sendEmail({
            to: sub.email,
            subject: dto.subject,
            html: this.wrapHtml(dto.html, sub),
          });
          sent += 1;
        } catch (err) {
          failed += 1;
          this.logger.warn(`Broadcast to ${sub.email} failed: ${err}`);
        }
      }),
    );

    this.logger.log(
      `Broadcast "${dto.subject}" → ${sent} sent, ${failed} failed (of ${active.length}).`,
    );
    return { sent, failed, total: active.length };
  }

  /**
   * Bulk-mail an uploaded recipient list (Excel/CSV). Parses every sheet/cell,
   * extracts + de-duplicates valid email addresses, and sends the same message
   * to each. Recipients need not be subscribers (no per-recipient unsubscribe).
   */
  async broadcastFromFile(
    subject: string,
    html: string,
    fileBuffer: Buffer,
  ): Promise<{ sent: number; failed: number; total: number; invalidRows: number }> {
    const { emails, invalidRows } = this.extractEmails(fileBuffer);

    let sent = 0;
    let failed = 0;
    await Promise.all(
      emails.map(async (to) => {
        try {
          await this.email.sendEmail({ to, subject, html: this.wrapHtml(html) });
          sent += 1;
        } catch (err) {
          failed += 1;
          this.logger.warn(`Bulk mail to ${to} failed: ${err}`);
        }
      }),
    );

    this.logger.log(
      `Bulk mail "${subject}" → ${sent} sent, ${failed} failed (of ${emails.length} valid; ${invalidRows} skipped).`,
    );
    return { sent, failed, total: emails.length, invalidRows };
  }

  /** Parse a spreadsheet buffer → unique lower-cased emails (+ count of non-email cells). */
  private extractEmails(fileBuffer: Buffer): { emails: string[]; invalidRows: number } {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const seen = new Set<string>();
    let invalidRows = 0;

    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1,
        blankrows: false,
      });
      for (const row of rows) {
        const cells = (row ?? []).map((c) => String(c ?? '')).filter(Boolean);
        if (!cells.length) continue;
        const matches = cells.join(' ').match(EMAIL_RE);
        if (matches) {
          for (const m of matches) seen.add(m.trim().toLowerCase());
        } else {
          invalidRows += 1; // a non-empty row with no email (e.g. a header)
        }
      }
    }
    return { emails: [...seen], invalidRows };
  }

  /** Send a one-off test email (to verify SMTP). Throws if a configured transport fails. */
  async sendTest(to: string): Promise<{ configured: boolean }> {
    await this.email.sendEmail({
      to,
      subject: 'RMC — test email',
      html:
        '<div style="font-family:Arial,Helvetica,sans-serif">' +
        '<h2 style="color:#0d3d24">RMC test email</h2>' +
        '<p>If you can read this, your SMTP settings are working correctly.</p></div>',
    });
    return { configured: this.email.isConfigured };
  }

  private sendWelcome(sub: Subscriber): Promise<void> {
    return this.email.sendEmail({
      to: sub.email,
      subject: 'You’re subscribed to RMC updates',
      html: this.wrapHtml(
        '<p>Thank you for subscribing to the Rwanda Muslim Community.</p>' +
          '<p>You’ll receive our latest announcements, programs and news.</p>',
        sub,
      ),
    });
  }

  /**
   * Wrap admin HTML in a branded, email-client-safe shell (table layout + inline
   * styles for Outlook/Gmail compatibility). When a subscriber is given, the
   * footer carries their per-recipient unsubscribe link; otherwise (e.g. bulk
   * mail to an uploaded list) it shows a generic notice.
   *
   * The logo is a PNG (WebP isn't supported by many email clients) served from
   * the frontend's public dir; in production FRONTEND_URL is the live domain.
   */
  /**
   * Rewrite root-relative links/images (href="/..", src="/..") in admin-authored
   * email HTML to absolute URLs on the live domain. Email clients have no page
   * origin, so a relative link is dead in the inbox — this makes them resolve.
   * Skips protocol-relative ("//cdn..."), anchors ("#..") and already-absolute URLs.
   */
  private absolutizeLinks(html: string, baseUrl: string): string {
    return html.replace(
      /(\b(?:href|src)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi,
      (_m, attr: string, quote: string, path: string) => `${attr}${quote}${baseUrl}${path}${quote}`,
    );
  }

  private wrapHtml(bodyHtml: string, sub?: Subscriber): string {
    const url = this.appUrl;
    const body = this.absolutizeLinks(bodyHtml, url);
    const year = new Date().getFullYear();
    const sans = 'Arial,Helvetica,sans-serif';

    const footerNote = sub
      ? `You receive this email because you subscribed to Rwanda Muslim Community updates.<br>
         <a href="${url}/${sub.locale || 'en'}/unsubscribe?token=${sub.unsubscribeToken}" style="color:#1a7a4a;text-decoration:underline">Unsubscribe</a> at any time.`
      : 'You received this message from the Rwanda Muslim Community.';

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
}
