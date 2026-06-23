import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MoMoPaymentRequest {
  amount: number;
  currency?: string;
  externalId: string;
  payerPhone: string;
  payerMessage: string;
  payeeNote: string;
}

export interface MoMoPaymentResult {
  referenceId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
}

@Injectable()
export class MoMoService {
  private readonly logger = new Logger(MoMoService.name);
  private readonly baseUrl = 'https://sandbox.momodeveloper.mtn.com';

  constructor(private readonly config: ConfigService) {}

  /**
   * Whether real MoMo credentials are configured. When false, callers should
   * treat the gateway as unavailable (no live payment is initiated or polled).
   */
  isConfigured(): boolean {
    return !!(
      this.config.get<string>('MOMO_SUBSCRIPTION_KEY') &&
      this.config.get<string>('MOMO_API_USER') &&
      this.config.get<string>('MOMO_API_KEY')
    );
  }

  async requestToPay(request: MoMoPaymentRequest): Promise<MoMoPaymentResult> {
    const subscriptionKey = this.config.get<string>('MOMO_SUBSCRIPTION_KEY');
    const apiUser = this.config.get<string>('MOMO_API_USER');
    const apiKey = this.config.get<string>('MOMO_API_KEY');
    const currency = request.currency ?? this.config.get<string>('MOMO_CURRENCY', 'EUR');

    if (!subscriptionKey || !apiUser || !apiKey) {
      this.logger.log(
        `[MoMo RTP] ${request.payerPhone} → ${request.amount} ${currency} (ref: ${request.externalId})`,
      );
      return { referenceId: request.externalId, status: 'PENDING' };
    }

    const token = await this.getAccessToken(subscriptionKey, apiUser, apiKey);
    const referenceId = crypto.randomUUID();

    try {
      const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.config.get<string>('MOMO_ENVIRONMENT', 'sandbox'),
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: String(request.amount),
          currency,
          externalId: request.externalId,
          payer: { partyIdType: 'MSISDN', partyId: request.payerPhone },
          payerMessage: request.payerMessage,
          payeeNote: request.payeeNote,
        }),
      });

      if (res.status !== 202) {
        this.logger.error(`MoMo RTP failed (${res.status}): ${await res.text()}`);
        return { referenceId, status: 'FAILED' };
      }

      return { referenceId, status: 'PENDING' };
    } catch (err) {
      this.logger.error(`MoMo RTP error: ${err}`);
      return { referenceId, status: 'FAILED' };
    }
  }

  async getPaymentStatus(referenceId: string): Promise<MoMoPaymentResult> {
    const subscriptionKey = this.config.get<string>('MOMO_SUBSCRIPTION_KEY');
    const apiUser = this.config.get<string>('MOMO_API_USER');
    const apiKey = this.config.get<string>('MOMO_API_KEY');

    if (!subscriptionKey || !apiUser || !apiKey) {
      this.logger.log(`[MoMo Status] ref=${referenceId} (credentials not configured)`);
      return { referenceId, status: 'PENDING' };
    }

    const token = await this.getAccessToken(subscriptionKey, apiUser, apiKey);

    try {
      const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': this.config.get<string>('MOMO_ENVIRONMENT', 'sandbox'),
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      });

      if (!res.ok) return { referenceId, status: 'FAILED' };
      const data = await res.json();
      const status =
        data.status === 'SUCCESSFUL' ? 'SUCCESSFUL'
          : data.status === 'FAILED' ? 'FAILED'
          : 'PENDING';
      return { referenceId, status };
    } catch (err) {
      this.logger.error(`MoMo status check error: ${err}`);
      return { referenceId, status: 'FAILED' };
    }
  }

  private async getAccessToken(subscriptionKey: string, apiUser: string, apiKey: string): Promise<string> {
    const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    });
    if (!res.ok) throw new Error(`MoMo token fetch failed: ${res.status}`);
    const data = await res.json();
    return data.access_token;
  }
}
