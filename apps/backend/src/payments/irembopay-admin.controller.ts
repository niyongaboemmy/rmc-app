import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';
import { ProviderProductsService } from '../payment-settings/provider-products.service';
import { UpsertProviderProductDto } from '../payment-settings/dto/upsert-provider-product.dto';
import {
  TestIremboPayInvoiceDto,
  TestIremboPayPushDto,
} from '../payment-settings/dto/test-irembopay.dto';
import { IremboPayConfigService } from '../integrations/irembo-pay/irembo-pay.config.service';
import { IremboPayInvoiceService } from '../integrations/irembo-pay/irembopay-invoice.service';
import { IREMBOPAY_PROVIDER_KEY } from './providers/irembo-pay.provider';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../payment-settings/entities/payment-transaction.entity';

/**
 * IremboPay's slice of the payments admin API.
 *
 * It lives in `PaymentsModule` rather than on `PaymentSettingsController`
 * because the provider depends on the settings module — putting these routes
 * there would make the two modules import each other.
 */
@ApiTags('Payment Settings — Admin')
@Controller('admin/payment-settings')
@ApiBearerAuth()
export class IremboPayAdminController {
  constructor(
    private readonly products: ProviderProductsService,
    private readonly config: IremboPayConfigService,
    private readonly invoices: IremboPayInvoiceService,
    private readonly gateway: PaymentGatewayService,
    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
  ) {}

  // ── Product mapping ────────────────────────────────────────────────────────

  @Get('providers/:provider/products')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({
    summary: 'Payment types and rates with their provider product mapping, unmapped ones flagged',
  })
  listProducts(@Param('provider') provider: string) {
    return this.products.listRows(provider);
  }

  @Put('providers/:provider/products')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create or update a payment type → provider product mapping' })
  upsertProduct(@Param('provider') provider: string, @Body() dto: UpsertProviderProductDto) {
    return this.products.upsert(provider, {
      paymentTypeId: dto.paymentTypeId,
      paymentTypeRateId: dto.paymentTypeRateId ?? null,
      productCode: dto.productCode,
      paymentAccountIdentifier: dto.paymentAccountIdentifier ?? null,
    });
  }

  @Delete('providers/:provider/products/:id')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product mapping' })
  removeProduct(@Param('provider') provider: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(provider, id);
  }

  // ── Configuration readback (non-sensitive) ────────────────────────────────

  @Get('irembopay/status')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Resolved IremboPay configuration — never includes the secret key' })
  async status() {
    const cfg = await this.config.get();
    const rows = await this.products.listRows(IREMBOPAY_PROVIDER_KEY);

    return {
      configured: await this.config.isConfigured(),
      // Surfaced so the admin panel can say "these payments are simulated"
      // rather than showing a green light that means something else entirely.
      simulated: await this.config.isSimulated(),
      simulatorMode: cfg.simulatorMode,
      simulatorDelayMs: cfg.simulatorDelayMs,
      isTestMode: cfg.isTestMode,
      apiBaseUrl: cfg.apiBaseUrl,
      widgetScriptUrl: cfg.widgetScriptUrl,
      apiVersion: cfg.apiVersion,
      publicKey: cfg.publicKey,
      paymentAccountIdentifier: cfg.paymentAccountIdentifier,
      invoiceExpiryMinutes: cfg.invoiceExpiryMinutes,
      defaultLanguage: cfg.defaultLanguage,
      signatureToleranceSeconds: cfg.signatureToleranceSeconds,
      unmappedPaymentTypes: rows.filter((r) => r.unmapped && !r.paymentTypeRateId).length,
    };
  }

  // ── Test panel ─────────────────────────────────────────────────────────────

  @Post('test/irembopay/invoice')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create a test IremboPay invoice (no MoMo prompt)' })
  testInvoice(@CurrentUser() user: User, @Body() dto: TestIremboPayInvoiceDto) {
    return this.charge(user, dto);
  }

  @Post('test/irembopay/push')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create a test invoice and push a MoMo prompt to the given number' })
  testPush(@CurrentUser() user: User, @Body() dto: TestIremboPayPushDto) {
    return this.charge(user, dto, dto.paymentProvider ?? 'MTN');
  }

  @Post('test/irembopay/recheck/:reference')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Re-check one invoice against IremboPay — the admin recovery for a lost callback',
  })
  recheck(@Param('reference') reference: string) {
    // Through the router like every other status read, so a second provider
    // would be re-checked correctly without touching this controller.
    return this.gateway.getStatus(reference, PaymentMethodCode.IREMBOPAY, { allowInactive: true });
  }

  /**
   * Re-check one recorded transaction against the gateway and return its
   * refreshed row. Drives the "Check status" button in the admin test panel.
   *
   * It deliberately does not write the transaction itself: `getStatus()` routes
   * through the port, and on IremboPay that re-applies the invoice state to the
   * ledger — so the row is re-read afterwards rather than written twice with
   * two different ideas of the truth.
   *
   * Lives on this controller rather than `PaymentSettingsController` for the
   * same reason the rest of these routes do: the gateway depends on the
   * settings module, so the settings controller cannot reach it without the two
   * modules importing each other. The route path is unchanged either way — both
   * controllers share the `admin/payment-settings` prefix.
   */
  @Get('test/payment/:txId/status')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Re-check one transaction against the gateway' })
  async checkTransactionStatus(@Param('txId', ParseUUIDPipe) txId: string) {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status !== PaymentTransactionStatus.PENDING) {
      return { transaction: tx, gatewayStatus: tx.status, message: tx.message ?? '' };
    }

    const result = await this.gateway.getStatus(tx.requestTransactionId);
    const refreshed = (await this.txRepo.findOne({ where: { id: txId } })) ?? tx;

    return {
      transaction: refreshed,
      gatewayStatus: result.status,
      message: result.message ?? '',
    };
  }

  @Get('irembopay/invoices/:reference')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Locally mirrored state of one invoice' })
  async localInvoice(@Param('reference') reference: string) {
    return (
      (await this.invoices.findByInvoiceNumber(reference)) ??
      (await this.invoices.findByTransactionId(reference))
    );
  }

  private async charge(user: User, dto: TestIremboPayInvoiceDto, pushProvider?: 'MTN' | 'AIRTEL') {
    const transactionId = `TEST-${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    // Routed through the gateway rather than the provider so the test panel
    // shares one charge path with donations and the services — including its
    // logging and its "is it configured?" guard. `allowInactive` is the single
    // documented exception: credentials must be provable before activation.
    const result = await this.gateway.charge(
      {
        transactionId,
        amount: dto.amount ?? 100,
        currency: 'RWF',
        paymentTypeKey: dto.paymentTypeKey ?? 'DONATION',
        payer: {
          name: `${user.firstName ?? 'RMC'} ${user.lastName ?? 'Admin'}`.trim(),
          phone: dto.mobilePhone ?? '0781234567',
          email: user.email,
        },
        locale: dto.locale,
        description: 'IremboPay connection test — RMC admin settings',
        pushProvider,
        isTest: true,
        initiatedBy: user.id,
      },
      PaymentMethodCode.IREMBOPAY,
      { allowInactive: true },
    );

    return {
      transactionId,
      invoiceNumber: result.providerReference,
      paymentLinkUrl: result.paymentLinkUrl,
      status: result.status,
      responseCode: result.responseCode,
      message: result.message,
      publicKey: result.publicKey,
      widgetScriptUrl: result.widgetScriptUrl,
    };
  }
}
