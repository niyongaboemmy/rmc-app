import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentEventsService } from '../payment-settings/payment-events.service';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
export declare class WebhooksController {
    private readonly paymentSettings;
    private readonly paymentEvents;
    private readonly marriageWebhook;
    private readonly donationWebhook;
    private readonly logger;
    constructor(paymentSettings: PaymentSettingsService, paymentEvents: PaymentEventsService, marriageWebhook: MarriageWebhookService, donationWebhook: DonationWebhookService);
    intouchPayCallback(body: Record<string, unknown>): Promise<{
        message: string;
        success: boolean;
        request_id: string;
    }>;
}
