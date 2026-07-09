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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sms_config_service_1 = require("./sms-config.service");
const sms_message_entity_1 = require("./entities/sms-message.entity");
const sms_types_1 = require("./sms.types");
const INTOUCH_API_URL = 'https://www.intouchsms.co.rw/api/sendsms/.json';
const SMS_SINGLE_LIMIT = 160;
const SMS_MULTIPART_LIMIT = 153;
let SmsService = SmsService_1 = class SmsService {
    constructor(smsConfig, historyRepo) {
        this.smsConfig = smsConfig;
        this.historyRepo = historyRepo;
        this.logger = new common_1.Logger(SmsService_1.name);
    }
    async send(options) {
        const recipients = this.resolveRecipients(options.to);
        const message = this.validateMessage(options.message);
        if (recipients.length === 0) {
            return this.failResult([], 'No valid recipients provided.');
        }
        const cfg = await this.smsConfig.getActiveConfig();
        if (!cfg) {
            const result = this.consoleFallback(recipients, message, 'RMC');
            void this.saveHistory(result, message, 'RMC');
            return result;
        }
        const sender = this.sanitizeSender(options.sender ?? cfg.senderName);
        const dlrUrl = options.dlrUrl ?? cfg.dlrUrl ?? '';
        const result = await this.callIntouchApi(cfg.username, cfg.password, recipients, message, sender, dlrUrl);
        void this.saveHistory(result, message, sender);
        return result;
    }
    async sendSms(to, message) {
        const result = await this.send({ to, message }).catch((err) => {
            this.logger.error(`SMS dispatch error: ${err}`);
            return null;
        });
        if (result && !result.success) {
            this.logger.warn(`SMS to ${to} not delivered: ${result.error ?? 'unknown reason'}`);
        }
    }
    async sendBulk(options) {
        return this.send(options);
    }
    async callIntouchApi(username, password, recipients, message, sender, dlrUrl) {
        const body = new URLSearchParams({
            recipients: recipients.join(','),
            message,
            sender,
            ...(dlrUrl ? { dlrurl: dlrUrl } : {}),
        });
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        let attempt = 0;
        const maxAttempts = 2;
        while (attempt < maxAttempts) {
            attempt++;
            try {
                const res = await fetch(INTOUCH_API_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${basicAuth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    body: body.toString(),
                    signal: AbortSignal.timeout(15_000),
                });
                if (res.status === 400) {
                    const text = await res.text();
                    this.logger.error(`InTouch rejected request (400): ${text}`);
                    return this.failResult(recipients, `Gateway rejected request: ${text}`);
                }
                if (!res.ok) {
                    const text = await res.text();
                    if (attempt < maxAttempts) {
                        this.logger.warn(`InTouch attempt ${attempt} failed (${res.status}), retrying…`);
                        await this.sleep(1000 * attempt);
                        continue;
                    }
                    return this.failResult(recipients, `Gateway error (${res.status}): ${text}`);
                }
                const data = await res.json();
                return this.parseApiResponse(recipients, data);
            }
            catch (err) {
                if (attempt < maxAttempts) {
                    this.logger.warn(`InTouch attempt ${attempt} threw, retrying: ${err}`);
                    await this.sleep(1000 * attempt);
                    continue;
                }
                this.logger.error(`InTouch SMS failed after ${maxAttempts} attempts: ${err}`);
                return this.failResult(recipients, `Network error: ${String(err)}`);
            }
        }
        return this.failResult(recipients, 'Exhausted retry attempts.');
    }
    parseApiResponse(recipients, data) {
        const details = (data.details ?? []).map((d) => ({
            status: (d.status ?? 'E'),
            message: d.message,
            cost: Number(d.cost ?? 0),
            recipient: d.receipient,
            messageId: d.messageid,
        }));
        const failedStatuses = ['E', 'U'];
        const allFailed = details.length > 0 && details.every((d) => failedStatuses.includes(d.status));
        const totalCost = data.summary?.cost != null
            ? Number(data.summary.cost)
            : details.reduce((sum, d) => sum + d.cost, 0);
        const balance = typeof data.summary?.balance === 'string'
            ? parseFloat(data.summary.balance.replace(/,/g, ''))
            : Number(data.summary?.balance ?? 0);
        const sentAt = this.parseSentAt(data.summary?.time ?? '');
        if (!data.success || allFailed) {
            this.logger.warn(`InTouch SMS: some/all messages failed — ${JSON.stringify(details)}`);
        }
        else {
            this.logger.log(`SMS sent to ${details.length} recipient(s). Cost: ${totalCost.toFixed(2)} RWF | Balance: ${balance.toLocaleString()} RWF`);
            for (const d of details) {
                const desc = sms_types_1.DLR_STATUS_DESCRIPTIONS[d.status] ?? d.status;
                this.logger.debug(`  → ${d.recipient} [${d.status}] ${desc} (msgId: ${d.messageId})`);
            }
            if (balance > 0) {
                void this.smsConfig.updateBalance(balance);
            }
        }
        return {
            success: data.success && !allFailed,
            provider: 'intouch',
            recipients,
            details,
            summary: data.summary
                ? { totalMessages: data.summary.totalmessages, cost: totalCost, balance, sentAt }
                : undefined,
        };
    }
    parseSentAt(raw) {
        if (!raw || raw.length < 14)
            return raw;
        const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
        const h = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14);
        const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
        return isNaN(Date.parse(iso)) ? raw : new Date(iso).toISOString();
    }
    consoleFallback(recipients, message, sender) {
        const preview = message.length > 80 ? `${message.slice(0, 80)}…` : message;
        this.logger.log(`[SMS][${sender}→${recipients.join(', ')}] ${preview}`);
        const parts = Math.ceil(message.length / SMS_MULTIPART_LIMIT) || 1;
        if (parts > 1) {
            this.logger.debug(`  (multipart: ${parts} frames, ${message.length} chars)`);
        }
        return {
            success: true,
            provider: 'console',
            recipients,
            details: recipients.map((r) => ({
                status: 'P',
                message,
                cost: 0,
                recipient: r,
                messageId: 0,
            })),
        };
    }
    failResult(recipients, error) {
        return { success: false, provider: 'intouch', recipients, details: [], error };
    }
    resolveRecipients(input) {
        const raw = Array.isArray(input)
            ? input
            : input.split(',').map((s) => s.trim()).filter(Boolean);
        const normalised = raw
            .map((p) => this.normalizePhone(p))
            .filter((p) => {
            if (!this.isValidPhone(p)) {
                this.logger.warn(`Invalid phone number skipped: "${p}"`);
                return false;
            }
            return true;
        });
        return [...new Set(normalised)];
    }
    normalizePhone(phone) {
        const cleaned = phone.replace(/[\s\-().]/g, '').replace(/^\+/, '');
        if (/^250\d{9}$/.test(cleaned))
            return cleaned;
        if (/^0[0-9]\d{8}$/.test(cleaned))
            return `250${cleaned.slice(1)}`;
        return cleaned;
    }
    isValidPhone(phone) {
        return /^250[0-9]{9}$/.test(phone);
    }
    validateMessage(message) {
        const trimmed = message?.trim();
        if (!trimmed)
            throw new Error('SMS message cannot be empty.');
        if (trimmed.length > SMS_SINGLE_LIMIT) {
            const parts = Math.ceil(trimmed.length / SMS_MULTIPART_LIMIT);
            this.logger.debug(`Long SMS (${trimmed.length} chars) → ${parts} frames.`);
        }
        return trimmed;
    }
    sanitizeSender(sender) {
        return sender.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 11).trim() || 'RMC';
    }
    async saveHistory(result, message, sender) {
        try {
            await this.historyRepo.save(this.historyRepo.create({
                recipients: result.recipients,
                message,
                sender: sender ?? null,
                provider: result.provider,
                success: result.success,
                totalMessages: result.summary?.totalMessages ?? null,
                cost: result.summary?.cost != null ? result.summary.cost : null,
                balanceAfter: result.summary?.balance != null ? result.summary.balance : null,
                error: result.error ?? null,
                details: result.details.length ? result.details : null,
                sentAt: result.summary?.sentAt ? new Date(result.summary.sentAt) : new Date(),
            }));
        }
        catch (err) {
            this.logger.warn(`Failed to save SMS history record: ${err}`);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(sms_message_entity_1.SmsMessage)),
    __metadata("design:paramtypes", [sms_config_service_1.SmsConfigService,
        typeorm_2.Repository])
], SmsService);
//# sourceMappingURL=sms.service.js.map