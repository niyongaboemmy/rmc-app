"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SubscribersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscribersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const XLSX = require("xlsx");
const subscriber_entity_1 = require("./entities/subscriber.entity");
const email_service_1 = require("../integrations/email/email.service");
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
let SubscribersService = SubscribersService_1 = class SubscribersService {
    constructor(subscribers, email, config) {
        this.subscribers = subscribers;
        this.email = email;
        this.config = config;
        this.logger = new common_1.Logger(SubscribersService_1.name);
    }
    get appUrl() {
        return this.config.get('FRONTEND_URL') || 'https://isengesho.com';
    }
    async subscribe(dto) {
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
    async unsubscribe(token) {
        const sub = await this.subscribers.findOne({ where: { unsubscribeToken: token } });
        if (!sub)
            return { unsubscribed: false };
        if (sub.isActive) {
            sub.isActive = false;
            await this.subscribers.save(sub);
        }
        return { unsubscribed: true };
    }
    async adminList() {
        const items = await this.subscribers.find({ order: { createdAt: 'DESC' } });
        const active = items.filter((s) => s.isActive).length;
        return { items, total: items.length, active };
    }
    async adminRemove(id) {
        const sub = await this.subscribers.findOne({ where: { id } });
        if (!sub)
            throw new common_1.NotFoundException('Subscriber not found');
        await this.subscribers.remove(sub);
        return { id };
    }
    async broadcast(dto) {
        const active = await this.subscribers.find({ where: { isActive: true } });
        let sent = 0;
        let failed = 0;
        await Promise.all(active.map(async (sub) => {
            try {
                await this.email.sendEmail({
                    to: sub.email,
                    subject: dto.subject,
                    html: this.wrapHtml(dto.html, sub),
                });
                sent += 1;
            }
            catch (err) {
                failed += 1;
                this.logger.warn(`Broadcast to ${sub.email} failed: ${err}`);
            }
        }));
        this.logger.log(`Broadcast "${dto.subject}" → ${sent} sent, ${failed} failed (of ${active.length}).`);
        return { sent, failed, total: active.length };
    }
    async broadcastFromFile(subject, html, fileBuffer) {
        const { emails, invalidRows } = this.extractEmails(fileBuffer);
        let sent = 0;
        let failed = 0;
        await Promise.all(emails.map(async (to) => {
            try {
                await this.email.sendEmail({ to, subject, html: this.wrapHtml(html) });
                sent += 1;
            }
            catch (err) {
                failed += 1;
                this.logger.warn(`Bulk mail to ${to} failed: ${err}`);
            }
        }));
        this.logger.log(`Bulk mail "${subject}" → ${sent} sent, ${failed} failed (of ${emails.length} valid; ${invalidRows} skipped).`);
        return { sent, failed, total: emails.length, invalidRows };
    }
    extractEmails(fileBuffer) {
        const wb = XLSX.read(fileBuffer, { type: 'buffer' });
        const seen = new Set();
        let invalidRows = 0;
        for (const name of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
                header: 1,
                blankrows: false,
            });
            for (const row of rows) {
                const cells = (row ?? []).map((c) => String(c ?? '')).filter(Boolean);
                if (!cells.length)
                    continue;
                const matches = cells.join(' ').match(EMAIL_RE);
                if (matches) {
                    for (const m of matches)
                        seen.add(m.trim().toLowerCase());
                }
                else {
                    invalidRows += 1;
                }
            }
        }
        return { emails: [...seen], invalidRows };
    }
    async sendTest(to) {
        await this.email.sendEmail({
            to,
            subject: 'RMC — test email',
            html: '<div style="font-family:Arial,Helvetica,sans-serif">' +
                '<h2 style="color:#0d3d24">RMC test email</h2>' +
                '<p>If you can read this, your SMTP settings are working correctly.</p></div>',
        });
        return { configured: this.email.isConfigured };
    }
    sendWelcome(sub) {
        return this.email.sendEmail({
            to: sub.email,
            subject: 'You’re subscribed to RMC updates',
            html: this.wrapHtml('<p>Thank you for subscribing to the Rwanda Muslim Community.</p>' +
                '<p>You’ll receive our latest announcements, programs and news.</p>', sub),
        });
    }
    absolutizeLinks(html, baseUrl) {
        return html.replace(/(\b(?:href|src)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi, (_m, attr, quote, path) => `${attr}${quote}${baseUrl}${path}${quote}`);
    }
    wrapHtml(bodyHtml, sub) {
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
};
exports.SubscribersService = SubscribersService;
exports.SubscribersService = SubscribersService = SubscribersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscriber_entity_1.Subscriber)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService,
        config_1.ConfigService])
], SubscribersService);
//# sourceMappingURL=subscribers.service.js.map