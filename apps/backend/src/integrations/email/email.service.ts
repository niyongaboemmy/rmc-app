import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// SMTP transport: dev uses MailHog/Mailpit (no auth); prod uses cPanel SMTP.
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: config.get<string>('SMTP_SECURE') === 'true',
        // Auth is optional — dev catchers like MailHog/Mailpit accept mail
        // without credentials; real SMTP servers need user+pass.
        ...(user && pass ? { auth: { user, pass } } : {}),
      });
    } else {
      this.logger.warn(
        'SMTP not configured (no SMTP_HOST) — emails will be logged to console only',
      );
    }
  }

  /** Verify the SMTP connection on startup so misconfiguration is visible in logs. */
  async onModuleInit(): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.verify();
      this.logger.log(
        `SMTP ready: ${this.config.get('SMTP_HOST')}:${this.config.get('SMTP_PORT', 587)}`,
      );
    } catch (err) {
      this.logger.error(`SMTP connection failed — emails will not send: ${err}`);
    }
  }

  /** True when a real SMTP transport is configured (vs. console-log fallback). */
  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const from =
      this.config.get<string>('EMAIL_FROM') ||
      this.config.get<string>('SMTP_FROM') ||
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
    } catch (err) {
      this.logger.error(`Email send failed to ${to}: ${err}`);
      throw err;
    }
  }
}
