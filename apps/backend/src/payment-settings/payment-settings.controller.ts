import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentEventsService } from './payment-events.service';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { UpsertPaymentMethodSettingsDto } from './dto/upsert-payment-method-settings.dto';
import { UpsertPaymentTypeRateDto } from './dto/upsert-payment-type-rate.dto';
import { TestPaymentDto } from './dto/test-payment.dto';
import { TestDepositDto } from './dto/test-deposit.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Payment Settings — Admin')
@Controller('admin/payment-settings')
@ApiBearerAuth()
export class PaymentSettingsController {
  constructor(
    private readonly service: PaymentSettingsService,
    private readonly events: PaymentEventsService,
  ) {}

  // ── Payment Methods ────────────────────────────────────────────────────────

  @Get('methods')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'List all payment methods' })
  findAllMethods() {
    return this.service.findAllMethods();
  }

  @Patch('methods/:id')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update a payment method' })
  updateMethod(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.service.updateMethod(id, dto);
  }

  @Patch('methods/:id/toggle')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Toggle a payment method active/inactive' })
  toggleMethod(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleMethodActive(id);
  }

  // ── Payment Types ──────────────────────────────────────────────────────────

  @Get('types')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'List all payment types (service areas)' })
  findAllTypes() {
    return this.service.findAllTypes();
  }

  @Patch('types/:id')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update name, description or default amount of a payment type' })
  updateType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePaymentTypeDto) {
    return this.service.updateType(id, dto);
  }

  @Patch('types/:id/toggle')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Toggle a payment type active/inactive' })
  toggleType(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleTypeActive(id);
  }

  // ── Payment Type Rates ─────────────────────────────────────────────────────

  @Get('types/:id/rates')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'List rates/sub-categories for a payment type' })
  listRates(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTypeRates(id);
  }

  @Post('types/:id/rates')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Add a rate/sub-category to a payment type' })
  createRate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertPaymentTypeRateDto) {
    return this.service.createRate(id, dto);
  }

  @Patch('types/:id/rates/:rateId')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update a rate/sub-category' })
  updateRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rateId', ParseUUIDPipe) rateId: string,
    @Body() dto: UpsertPaymentTypeRateDto,
  ) {
    return this.service.updateRate(id, rateId, dto);
  }

  @Patch('types/:id/rates/:rateId/toggle')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Toggle a rate active/inactive' })
  toggleRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rateId', ParseUUIDPipe) rateId: string,
  ) {
    return this.service.toggleRateActive(id, rateId);
  }

  @Delete('types/:id/rates/:rateId')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rate/sub-category' })
  deleteRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rateId', ParseUUIDPipe) rateId: string,
  ) {
    return this.service.deleteRate(id, rateId);
  }

  // ── Method Settings (credentials) ─────────────────────────────────────────

  @Get('methods/:id/settings')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get credentials for a payment method (sensitive fields masked)' })
  @ApiQuery({ name: 'reveal', required: false, type: Boolean })
  getMethodSettings(@Param('id', ParseUUIDPipe) id: string, @Query('reveal') reveal?: string) {
    return this.service.getMethodSettings(id, reveal === 'true');
  }

  @Put('methods/:id/settings')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Save credentials for a payment method' })
  upsertMethodSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPaymentMethodSettingsDto,
  ) {
    return this.service.upsertMethodSettings(id, dto);
  }

  // ── Test Payment ───────────────────────────────────────────────────────────

  @Post('test/payment')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Send a test payment request via IntouchPay MoMo' })
  testPayment(@CurrentUser() user: User, @Body() dto: TestPaymentDto) {
    return this.service.testPayment(dto, user.id);
  }

  @Get('test/payment/:txId/status')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Check payment status for a transaction' })
  checkPaymentStatus(@Param('txId', ParseUUIDPipe) txId: string) {
    return this.service.checkTransactionStatus(txId);
  }

  @Post('test/deposit')
  @Permissions(Permission.PAYMENT_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Send a test deposit (send money) via IntouchPay RequestDeposit' })
  testDeposit(@CurrentUser() user: User, @Body() dto: TestDepositDto) {
    return this.service.testDeposit(dto, user.id);
  }

  // ── Transaction History ────────────────────────────────────────────────────

  @Get('transactions')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'List payment transactions (test and live)' })
  @ApiQuery({ name: 'isTest', required: false, type: Boolean })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentTypeKey', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listTransactions(
    @Query('isTest') isTest?: string,
    @Query('status') status?: string,
    @Query('paymentTypeKey') paymentTypeKey?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listTransactions({
      isTest: isTest !== undefined ? isTest === 'true' : undefined,
      status,
      paymentTypeKey,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // ── Balance ────────────────────────────────────────────────────────────────

  @Get('balance')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Query IntouchPay account balance' })
  getBalance() {
    return this.service.getAccountBalance();
  }

  // ── Server-Sent Events ─────────────────────────────────────────────────────

  @Sse('events')
  @Permissions(Permission.PAYMENT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'SSE stream — emits payment callback events in real time' })
  paymentEvents(): Observable<MessageEvent> {
    return this.events.stream$.pipe(map((data) => ({ data }) as MessageEvent));
  }
}
