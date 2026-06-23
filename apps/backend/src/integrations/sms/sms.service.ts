import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(to: string, message: string): Promise<void> {
    if (!to) {
      this.logger.warn('SMS skipped: no recipient phone');
      return;
    }

    const provider = this.config.get<string>('SMS_PROVIDER', 'console');

    if (provider === 'infobip') {
      await this.sendViaInfobip(to, message);
    } else if (provider === 'africastalking') {
      await this.sendViaAfricasTalking(to, message);
    } else {
      this.logger.log(`[SMS→${to}] ${message}`);
    }
  }

  private async sendViaInfobip(to: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('INFOBIP_API_KEY');
    const baseUrl = this.config.get<string>('INFOBIP_BASE_URL');
    const from = this.config.get<string>('INFOBIP_SENDER', 'RMC');

    if (!apiKey || !baseUrl) {
      this.logger.warn('Infobip credentials not set — falling back to console');
      this.logger.log(`[SMS→${to}] ${message}`);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [{ from, destinations: [{ to }], text: message }],
        }),
      });
      if (!res.ok) this.logger.warn(`Infobip SMS failed (${res.status}): ${await res.text()}`);
    } catch (err) {
      this.logger.error(`Infobip SMS error: ${err}`);
    }
  }

  private async sendViaAfricasTalking(to: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('AT_API_KEY');
    const username = this.config.get<string>('AT_USERNAME');
    const from = this.config.get<string>('AT_SENDER', 'RMC');

    if (!apiKey || !username) {
      this.logger.warn('Africa\'s Talking credentials not set — falling back to console');
      this.logger.log(`[SMS→${to}] ${message}`);
      return;
    }

    try {
      const body = new URLSearchParams({ username, to, message, from });
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) this.logger.warn(`AT SMS failed (${res.status}): ${await res.text()}`);
    } catch (err) {
      this.logger.error(`AT SMS error: ${err}`);
    }
  }
}
