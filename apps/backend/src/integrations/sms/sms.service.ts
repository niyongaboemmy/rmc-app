import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsConfigService } from './sms-config.service';
import { SmsMessage } from './entities/sms-message.entity';
import {
  DLR_STATUS_DESCRIPTIONS,
  IntouchApiResponse,
  SmsSendOptions,
  SmsSendResult,
} from './sms.types';

const INTOUCH_API_URL = 'https://www.intouchsms.co.rw/api/sendsms/.json';

const SMS_SINGLE_LIMIT = 160;
const SMS_MULTIPART_LIMIT = 153;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly smsConfig: SmsConfigService,
    @InjectRepository(SmsMessage)
    private readonly historyRepo: Repository<SmsMessage>,
  ) {}

  /**
   * Send an SMS to one or more recipients.
   *
   * Phone numbers are accepted in any Rwanda format:
   *   - Local 10-digit:    07xxxxxxxx
   *   - Intl without +:    2507xxxxxxxx
   *   - Full E.164:        +2507xxxxxxxx
   *
   * Returns a structured result with per-recipient status and cost summary.
   */
  async send(options: SmsSendOptions): Promise<SmsSendResult> {
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

    const result = await this.callIntouchApi(
      cfg.username,
      cfg.password,
      recipients,
      message,
      sender,
      dlrUrl,
    );
    void this.saveHistory(result, message, sender);
    return result;
  }

  /**
   * Convenience wrapper for single-recipient, fire-and-forget sends.
   * Errors are caught and logged; nothing is thrown to the caller.
   */
  async sendSms(to: string, message: string): Promise<void> {
    const result = await this.send({ to, message }).catch((err) => {
      this.logger.error(`SMS dispatch error: ${err}`);
      return null;
    });

    if (result && !result.success) {
      this.logger.warn(`SMS to ${to} not delivered: ${result.error ?? 'unknown reason'}`);
    }
  }

  /**
   * Send one message to multiple recipients in a single API call.
   */
  async sendBulk(options: Omit<SmsSendOptions, 'to'> & { to: string[] }): Promise<SmsSendResult> {
    return this.send(options);
  }

  // ─── InTouch HTTP API ────────────────────────────────────────────────────────

  private async callIntouchApi(
    username: string,
    password: string,
    recipients: string[],
    message: string,
    sender: string,
    dlrUrl: string,
  ): Promise<SmsSendResult> {
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

        const data: IntouchApiResponse = await res.json();
        return this.parseApiResponse(recipients, data);
      } catch (err) {
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

  private parseApiResponse(recipients: string[], data: IntouchApiResponse): SmsSendResult {
    const details = (data.details ?? []).map((d) => ({
      status: (d.status ?? 'E') as SmsSendResult['details'][number]['status'],
      message: d.message,
      cost: Number(d.cost ?? 0),
      recipient: d.receipient,
      messageId: d.messageid,
    }));

    const failedStatuses = ['E', 'U'];
    const allFailed = details.length > 0 && details.every((d) => failedStatuses.includes(d.status));

    // Cost: InTouch sometimes omits it from summary — sum from per-recipient details instead
    const totalCost =
      data.summary?.cost != null
        ? Number(data.summary.cost)
        : details.reduce((sum, d) => sum + d.cost, 0);

    // Balance: InTouch returns "3,697" (string with commas) or a raw number
    const balance =
      typeof data.summary?.balance === 'string'
        ? parseFloat((data.summary.balance as string).replace(/,/g, ''))
        : Number(data.summary?.balance ?? 0);

    // sentAt: InTouch format is "YYYYMMDDHHmmss" — convert to ISO for readability
    const sentAt = this.parseSentAt(data.summary?.time ?? '');

    if (!data.success || allFailed) {
      this.logger.warn(`InTouch SMS: some/all messages failed — ${JSON.stringify(details)}`);
    } else {
      this.logger.log(
        `SMS sent to ${details.length} recipient(s). Cost: ${totalCost.toFixed(2)} RWF | Balance: ${balance.toLocaleString()} RWF`,
      );
      for (const d of details) {
        const desc = DLR_STATUS_DESCRIPTIONS[d.status] ?? d.status;
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

  /** Convert InTouch "YYYYMMDDHHmmss" timestamp to ISO 8601. */
  private parseSentAt(raw: string): string {
    if (!raw || raw.length < 14) return raw;
    const y = raw.slice(0, 4),
      mo = raw.slice(4, 6),
      d = raw.slice(6, 8);
    const h = raw.slice(8, 10),
      mi = raw.slice(10, 12),
      s = raw.slice(12, 14);
    const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
    return isNaN(Date.parse(iso)) ? raw : new Date(iso).toISOString();
  }

  private consoleFallback(recipients: string[], message: string, sender: string): SmsSendResult {
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

  private failResult(recipients: string[], error: string): SmsSendResult {
    return { success: false, provider: 'intouch', recipients, details: [], error };
  }

  // ─── Validation & normalisation ──────────────────────────────────────────────

  private resolveRecipients(input: string | string[]): string[] {
    const raw = Array.isArray(input)
      ? input
      : input
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

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

  /**
   * Normalise to Rwanda E.164 without leading + (2507xxxxxxxx).
   * Accepted inputs: 07xxxxxxxx | 2507xxxxxxxx | +2507xxxxxxxx
   */
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-().]/g, '').replace(/^\+/, '');
    if (/^250\d{9}$/.test(cleaned)) return cleaned;
    if (/^0[0-9]\d{8}$/.test(cleaned)) return `250${cleaned.slice(1)}`;
    return cleaned;
  }

  private isValidPhone(phone: string): boolean {
    return /^250[0-9]{9}$/.test(phone);
  }

  private validateMessage(message: string): string {
    const trimmed = message?.trim();
    if (!trimmed) throw new Error('SMS message cannot be empty.');

    if (trimmed.length > SMS_SINGLE_LIMIT) {
      const parts = Math.ceil(trimmed.length / SMS_MULTIPART_LIMIT);
      this.logger.debug(`Long SMS (${trimmed.length} chars) → ${parts} frames.`);
    }

    return trimmed;
  }

  private sanitizeSender(sender: string): string {
    return (
      sender
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .slice(0, 11)
        .trim() || 'RMC'
    );
  }

  private async saveHistory(
    result: SmsSendResult,
    message: string,
    sender?: string,
  ): Promise<void> {
    try {
      await this.historyRepo.save(
        this.historyRepo.create({
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
        }),
      );
    } catch (err) {
      this.logger.warn(`Failed to save SMS history record: ${err}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
