import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';
import { ProviderProductsService } from '../../payment-settings/provider-products.service';
import { IremboPayConfigService } from '../../integrations/irembo-pay/irembo-pay.config.service';
import { IremboPayService } from '../../integrations/irembo-pay/irembo-pay.service';
import {
  IremboPayInvoiceService,
  toGatewayStatus,
} from '../../integrations/irembo-pay/irembopay-invoice.service';
import {
  IremboInvoice,
  IremboPayApiError,
  describeIremboError,
  isValidMsisdn,
} from '../../integrations/irembo-pay/irembo-pay.types';
import {
  PaymentChargeRequest,
  PaymentChargeResult,
  PaymentGatewayProvider,
  PaymentStatusResult,
} from '../payment-gateway.port';

export const IREMBOPAY_PROVIDER_KEY = 'irembopay';

/**
 * IremboPay behind the gateway port.
 *
 * The shape worth understanding: an *invoice* is the payable thing, and a MoMo
 * *push* is only one way to settle it. So a failed push is not a failed charge —
 * the invoice stays payable by card, bank or the payment link, and we return
 * PENDING with the push error as a message rather than throwing it away.
 */
@Injectable()
export class IremboPayProvider implements PaymentGatewayProvider {
  readonly code = PaymentMethodCode.IREMBOPAY;
  readonly providerName = 'IremboPay';

  private readonly logger = new Logger(IremboPayProvider.name);

  constructor(
    private readonly irembo: IremboPayService,
    private readonly config: IremboPayConfigService,
    private readonly invoices: IremboPayInvoiceService,
    private readonly products: ProviderProductsService,
  ) {}

  isConfigured(): Promise<boolean> {
    return this.config.isConfigured();
  }

  async charge(req: PaymentChargeRequest): Promise<PaymentChargeResult> {
    const cfg = await this.config.get();
    const currency = req.currency ?? 'RWF';

    // One invoice can carry several payment items, which is how a whole cart is
    // settled by a single payment rather than one invoice per line.
    const lines =
      req.items && req.items.length > 0
        ? req.items
        : [
            {
              paymentTypeKey: req.paymentTypeKey,
              paymentTypeRateId: req.paymentTypeRateId,
              amount: req.amount,
              quantity: 1,
            },
          ];

    // Throws a BadRequest naming the Products tab when unmapped — an admin can
    // act on that, where a generic 500 only produces a support ticket.
    const resolved = await Promise.all(
      lines.map(async (line) => ({
        line,
        product: await this.products.resolveForCharge(
          IREMBOPAY_PROVIDER_KEY,
          line.paymentTypeKey,
          line.paymentTypeRateId,
        ),
      })),
    );

    // A mixed-account invoice is not a thing IremboPay supports — the account
    // fixes the currency — so the first line's override wins and the rest fall
    // back to the method-level account.
    const paymentAccount =
      resolved.find((r) => r.product.paymentAccountIdentifier)?.product.paymentAccountIdentifier ||
      (await this.config.accountForCurrency(currency));

    const expiryAt = req.expiresAt
      ? this.irembo.formatExpiry(req.expiresAt)
      : await this.irembo.defaultExpiry();

    let invoice: IremboInvoice;
    try {
      invoice = await this.irembo.createInvoice({
        transactionId: req.transactionId,
        paymentAccountIdentifier: paymentAccount,
        paymentItems: resolved.map(({ line, product }) => ({
          code: product.productCode,
          quantity: line.quantity ?? 1,
          unitAmount: line.amount,
        })),
        expiryAt,
        description: req.description,
        language: req.locale ?? cfg.defaultLanguage,
        customer: {
          name: req.payer.name,
          phoneNumber: req.payer.phone,
          email: req.payer.email,
        },
      });
    } catch (err) {
      // Idempotency: the same transactionId was already invoiced. Recover its
      // state instead of dead-ending, so a retried charge converges.
      if (err instanceof IremboPayApiError && err.code === 'DUPLICATE_TRANSACTION_ID') {
        this.logger.log(
          `[IremboPay] Duplicate transactionId ${req.transactionId} — returning the existing invoice`,
        );
        invoice = await this.irembo.getInvoice(req.transactionId);
      } else {
        throw err;
      }
    }

    const stored = await this.invoices.recordNewInvoice(invoice, {
      paymentTypeKey: req.paymentTypeKey,
      referenceId: req.referenceId,
      isTest: req.isTest ?? cfg.isTestMode,
      payerPhone: req.payer.phone,
      initiatedBy: req.initiatedBy,
    });

    let status = toGatewayStatus(stored.paymentStatus);
    let message = `Invoice ${invoice.invoiceNumber} created`;
    let responseCode: string = stored.paymentStatus;

    if (req.pushProvider && status === 'PENDING') {
      const push = await this.tryPush(invoice.invoiceNumber, req);
      message = push.message;
      if (push.code) responseCode = push.code;
    }

    // The invoice may already have been paid (a duplicate-id recovery, or a
    // very fast payer) — never downgrade that to PENDING.
    status = toGatewayStatus(stored.paymentStatus);

    return {
      provider: IREMBOPAY_PROVIDER_KEY,
      status,
      providerReference: invoice.invoiceNumber,
      // Our id, not the invoice number: the callback carries `transactionId`,
      // so this is what the domain webhook services can actually match on.
      domainReference: req.transactionId,
      transactionId: req.transactionId,
      paymentLinkUrl: invoice.paymentLinkUrl ?? stored.paymentLinkUrl ?? undefined,
      publicKey: cfg.publicKey,
      widgetScriptUrl: cfg.widgetScriptUrl,
      responseCode,
      message,
      raw: invoice as unknown as Record<string, unknown>,
    };
  }

  /** `reference` is an invoiceNumber or our own transactionId — both resolve. */
  async getStatus(reference: string): Promise<PaymentStatusResult> {
    const invoice = await this.irembo.getInvoice(reference);
    const change = await this.invoices.applyInvoiceState(invoice, 'reconciliation');
    const status = change?.resolvedStatus ?? toGatewayStatus(invoice.paymentStatus);

    return {
      status,
      providerReference: invoice.invoiceNumber ?? reference,
      paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
      paidAmount: invoice.paidAmount !== undefined ? Number(invoice.paidAmount) : undefined,
      balance: invoice.balance !== undefined ? Number(invoice.balance) : undefined,
      providerPaymentMethod: invoice.paymentMethod,
      responseCode: invoice.paymentStatus,
      message:
        status === 'SUCCESSFUL'
          ? `Paid via ${invoice.paymentMethod ?? 'IremboPay'}`
          : status === 'FAILED'
            ? 'Invoice expired before payment'
            : 'Awaiting payment',
    };
  }

  /**
   * A push failure is recorded and reported, never rethrown: the invoice behind
   * it is still payable by every other channel, and throwing here would discard
   * a perfectly good invoice the payer could still settle.
   */
  private async tryPush(
    invoiceNumber: string,
    req: PaymentChargeRequest,
  ): Promise<{ message: string; code?: string }> {
    if (!req.payer.phone || !isValidMsisdn(req.payer.phone)) {
      return {
        message: `Invoice ${invoiceNumber} created. No MoMo prompt was sent — "${req.payer.phone ?? ''}" is not a valid Rwandan mobile number. The invoice is still payable by card, bank or payment link.`,
        code: 'BAD_PHONE_NUMBER',
      };
    }

    try {
      await this.irembo.initiateMomoPush({
        accountIdentifier: req.payer.phone,
        paymentProvider: req.pushProvider as 'MTN' | 'AIRTEL',
        invoiceNumber,
      });
      return { message: `MoMo prompt sent to ${req.payer.phone}. Approve it on your phone.` };
    } catch (err) {
      const apiError = err instanceof IremboPayApiError ? err : null;
      const detail = apiError
        ? describeIremboError(apiError.code, apiError.detail)
        : (err as Error).message;

      this.logger.warn(
        `[IremboPay] MoMo push failed for invoice ${invoiceNumber} (code=${apiError?.code ?? '-'}) — invoice remains payable`,
      );

      return {
        message: `${detail} The invoice is still payable by card, bank or payment link.`,
        code: apiError?.code,
      };
    }
  }
}
