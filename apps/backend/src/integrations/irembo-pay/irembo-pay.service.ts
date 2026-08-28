import { Injectable, Logger } from '@nestjs/common';
import { IremboPayClient } from './irembo-pay.client';
import { IremboPayConfigService } from './irembo-pay.config.service';
import { IremboPaySandboxService } from './irembopay-sandbox.service';
import {
  CreateInvoiceInput,
  InitiatePushInput,
  IremboInvoice,
  IremboPushResult,
  UpdateInvoiceInput,
  normalizeMsisdn,
} from './irembo-pay.types';

/**
 * Typed wrapper over the four IremboPay payment endpoints.
 *
 * Deliberately free of business logic: no persistence, no product lookup, no
 * status mapping. Those belong to the provider (Phase 4) — this layer only
 * knows the wire protocol, so it can be tested against a mocked HTTP layer
 * without a database.
 */
@Injectable()
export class IremboPayService {
  private readonly logger = new Logger(IremboPayService.name);

  constructor(
    private readonly client: IremboPayClient,
    private readonly config: IremboPayConfigService,
    private readonly sandbox: IremboPaySandboxService,
  ) {}

  isConfigured(): Promise<boolean> {
    return this.config.isConfigured();
  }

  /** `POST /payments/invoices` */
  async createInvoice(input: CreateInvoiceInput): Promise<IremboInvoice> {
    if (await this.sandbox.isActive()) return this.sandbox.createInvoice(input);

    const body: CreateInvoiceInput = {
      ...input,
      customer: input.customer
        ? {
            ...input.customer,
            phoneNumber: input.customer.phoneNumber
              ? normalizeMsisdn(input.customer.phoneNumber)
              : undefined,
          }
        : undefined,
    };

    this.logger.log(
      `[IremboPay] CreateInvoice txn=${input.transactionId} account=${input.paymentAccountIdentifier} items=${input.paymentItems.length}`,
    );

    return this.client.request<IremboInvoice>('create_invoice', {
      method: 'POST',
      path: '/payments/invoices',
      body,
      transactionId: input.transactionId,
    });
  }

  /** `GET /payments/invoices/{ref}` — `ref` is an invoiceNumber *or* our transactionId. */
  async getInvoice(ref: string): Promise<IremboInvoice> {
    if (await this.sandbox.isActive()) return this.sandbox.getInvoice(ref);

    return this.client.request<IremboInvoice>('get_invoice', {
      method: 'GET',
      path: `/payments/invoices/${encodeURIComponent(ref)}`,
      transactionId: ref,
    });
  }

  /**
   * `POST /payments/transactions/initiate` — pushes a MoMo prompt to the payer.
   *
   * The doc page header mislabels this as GET and claims no authentication is
   * required while listing the auth headers; it is a POST with a body, sent
   * authenticated like every other call.
   */
  async initiateMomoPush(input: InitiatePushInput): Promise<IremboPushResult> {
    if (await this.sandbox.isActive()) return this.sandbox.initiateMomoPush(input);

    const body: InitiatePushInput = {
      ...input,
      accountIdentifier: normalizeMsisdn(input.accountIdentifier),
    };

    this.logger.log(
      `[IremboPay] InitiatePush invoice=${input.invoiceNumber} provider=${input.paymentProvider}`,
    );

    return this.client.request<IremboPushResult>('initiate_push', {
      method: 'POST',
      path: '/payments/transactions/initiate',
      body,
      transactionId: input.invoiceNumber,
    });
  }

  /** `PUT /payments/invoices/{invoiceNumber}` — used to enable partial payments. */
  async updateInvoice(invoiceNumber: string, input: UpdateInvoiceInput): Promise<IremboInvoice> {
    if (await this.sandbox.isActive()) return this.sandbox.updateInvoice(invoiceNumber, input);

    return this.client.request<IremboInvoice>('update_invoice', {
      method: 'PUT',
      path: `/payments/invoices/${encodeURIComponent(invoiceNumber)}`,
      body: input,
      transactionId: invoiceNumber,
    });
  }

  /**
   * RFC 3339 with an explicit offset, as `BAD_EXPIRATION_DATE` demands.
   * `Date.toISOString()` emits `Z`, which is valid RFC 3339 but has been known
   * to be rejected, so the offset is written out longhand.
   */
  formatExpiry(date: Date): string {
    const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, '0');
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `.${pad(date.getMilliseconds(), 3)}${offset}`
    );
  }

  /** Expiry `invoiceExpiryMinutes` from now, per the configured setting. */
  async defaultExpiry(): Promise<string> {
    const cfg = await this.config.get();
    return this.formatExpiry(new Date(Date.now() + cfg.invoiceExpiryMinutes * 60_000));
  }
}
