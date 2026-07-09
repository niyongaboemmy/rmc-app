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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = null;
        const host = config.get('SMTP_HOST');
        const port = config.get('SMTP_PORT', 587);
        const user = config.get('SMTP_USER');
        const pass = config.get('SMTP_PASS');
        if (host) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: config.get('SMTP_SECURE') === 'true',
                ...(user && pass ? { auth: { user, pass } } : {}),
            });
        }
        else {
            this.logger.warn('SMTP not configured (no SMTP_HOST) — emails will be logged to console only');
        }
    }
    async onModuleInit() {
        if (!this.transporter)
            return;
        try {
            await this.transporter.verify();
            this.logger.log(`SMTP ready: ${this.config.get('SMTP_HOST')}:${this.config.get('SMTP_PORT', 587)}`);
        }
        catch (err) {
            this.logger.error(`SMTP connection failed — emails will not send: ${err}`);
        }
    }
    get isConfigured() {
        return this.transporter !== null;
    }
    async sendEmail(options) {
        const from = this.config.get('EMAIL_FROM') ||
            this.config.get('SMTP_FROM') ||
            'noreply@rmc.rw';
        const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        if (!this.transporter) {
            this.logger.log(`[EMAIL→${to}] ${options.subject}\n${options.text ?? options.html}`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from,
                to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
        }
        catch (err) {
            this.logger.error(`Email send failed to ${to}: ${err}`);
            throw err;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map