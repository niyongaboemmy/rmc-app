import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentMethodCode } from './entities/payment-method.entity';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentMethodSettings } from './entities/payment-method-settings.entity';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from './entities/payment-transaction.entity';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { UpsertPaymentMethodSettingsDto } from './dto/upsert-payment-method-settings.dto';
import { UpsertPaymentTypeRateDto } from './dto/upsert-payment-type-rate.dto';
import { TestPaymentDto } from './dto/test-payment.dto';
import {
  IntouchPayService,
  INTOUCH_RESPONSE_CODES,
} from '../integrations/intouch-pay/intouch-pay.service';
import * as crypto from 'crypto';

const SENSITIVE_FIELDS: Partial<Record<PaymentMethodCode, string[]>> = {
  [PaymentMethodCode.MOMO_INTOUCH]: ['partnerPassword'],
  [PaymentMethodCode.CARD]: ['secretKey', 'webhookSecret'],
};

const MASK = '••••••••';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly methodRepo: Repository<PaymentMethod>,

    @InjectRepository(PaymentType)
    private readonly typeRepo: Repository<PaymentType>,

    @InjectRepository(PaymentMethodSettings)
    private readonly settingsRepo: Repository<PaymentMethodSettings>,

    @InjectRepository(PaymentTypeRate)
    private readonly rateRepo: Repository<PaymentTypeRate>,

    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,

    private readonly intouchPay: IntouchPayService,
    private readonly configService: ConfigService,
  ) {}

  // ── Payment Methods ────────────────────────────────────────────────────────

  findAllMethods(): Promise<PaymentMethod[]> {
    return this.methodRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findMethodById(id: string): Promise<PaymentMethod> {
    const method = await this.methodRepo.findOne({ where: { id } });
    if (!method) throw new NotFoundException(`Payment method ${id} not found`);
    return method;
  }

  async findMethodByCode(code: PaymentMethodCode): Promise<PaymentMethod | null> {
    return this.methodRepo.findOne({ where: { code } });
  }

  async updateMethod(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const method = await this.findMethodById(id);
    Object.assign(method, dto);
    return this.methodRepo.save(method);
  }

  async toggleMethodActive(id: string): Promise<PaymentMethod> {
    const method = await this.findMethodById(id);
    method.isActive = !method.isActive;
    return this.methodRepo.save(method);
  }

  // ── Payment Types ──────────────────────────────────────────────────────────

  findAllTypes(): Promise<PaymentType[]> {
    return this.typeRepo.find({
      order: { createdAt: 'ASC' },
      relations: ['rates'],
    });
  }

  async findTypeById(id: string): Promise<PaymentType> {
    const type = await this.typeRepo.findOne({ where: { id }, relations: ['rates'] });
    if (!type) throw new NotFoundException(`Payment type ${id} not found`);
    return type;
  }

  async updateType(id: string, dto: UpdatePaymentTypeDto): Promise<PaymentType> {
    const type = await this.findTypeById(id);
    if (dto.name !== undefined) type.name = dto.name;
    if (dto.description !== undefined) type.description = dto.description;
    if (dto.amount !== undefined) type.amount = dto.amount;
    return this.typeRepo.save(type);
  }

  async toggleTypeActive(id: string): Promise<PaymentType> {
    const type = await this.findTypeById(id);
    type.isActive = !type.isActive;
    return this.typeRepo.save(type);
  }

  // ── Payment Type Rates ─────────────────────────────────────────────────────

  async findTypeRates(typeId: string): Promise<PaymentTypeRate[]> {
    await this.findTypeById(typeId); // verify exists
    return this.rateRepo.find({
      where: { paymentTypeId: typeId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createRate(typeId: string, dto: UpsertPaymentTypeRateDto): Promise<PaymentTypeRate> {
    await this.findTypeById(typeId);
    const rate = this.rateRepo.create({
      paymentTypeId: typeId,
      code: dto.code ?? null,
      name: dto.name,
      description: dto.description ?? null,
      amount: dto.amount,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.rateRepo.save(rate);
  }

  async updateRate(
    typeId: string,
    rateId: string,
    dto: UpsertPaymentTypeRateDto,
  ): Promise<PaymentTypeRate> {
    const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
    if (!rate) throw new NotFoundException(`Rate ${rateId} not found`);
    if (dto.name !== undefined) rate.name = dto.name;
    if (dto.description !== undefined) rate.description = dto.description ?? null;
    if (dto.amount !== undefined) rate.amount = dto.amount;
    if (dto.isActive !== undefined) rate.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) rate.sortOrder = dto.sortOrder;
    if (dto.code !== undefined) rate.code = dto.code ?? null;
    return this.rateRepo.save(rate);
  }

  async deleteRate(typeId: string, rateId: string): Promise<void> {
    const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
    if (!rate) throw new NotFoundException(`Rate ${rateId} not found`);
    await this.rateRepo.remove(rate);
  }

  async toggleRateActive(typeId: string, rateId: string): Promise<PaymentTypeRate> {
    const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
    if (!rate) throw new NotFoundException(`Rate ${rateId} not found`);
    rate.isActive = !rate.isActive;
    return this.rateRepo.save(rate);
  }

  /** Returns the active rate matching a code, or null. Used by domain services. */
  async getRateByCode(typeKey: string, rateCode: string): Promise<PaymentTypeRate | null> {
    const type = await this.typeRepo.findOne({ where: { key: typeKey as never } });
    if (!type) return null;
    return this.rateRepo.findOne({
      where: { paymentTypeId: type.id, code: rateCode, isActive: true },
    });
  }

  /** Returns all active rates for a type key. Used by domain services. */
  async getActiveRates(typeKey: string): Promise<PaymentTypeRate[]> {
    const type = await this.typeRepo.findOne({ where: { key: typeKey as never } });
    if (!type) return [];
    return this.rateRepo.find({
      where: { paymentTypeId: type.id, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ── Payment Method Settings ────────────────────────────────────────────────

  async getMethodSettings(
    methodId: string,
    revealSensitive = false,
  ): Promise<PaymentMethodSettings & { method: PaymentMethod }> {
    const method = await this.findMethodById(methodId);

    let settings = await this.settingsRepo.findOne({ where: { paymentMethodId: methodId } });
    if (!settings) {
      settings = this.settingsRepo.create({
        paymentMethodId: methodId,
        settings: {},
        isTestMode: true,
        isConfigured: false,
      });
      await this.settingsRepo.save(settings);
    }

    if (!revealSensitive) {
      settings.settings = this.maskSettings(settings.settings, method.code);
    }

    return Object.assign(settings, { method });
  }

  async upsertMethodSettings(
    methodId: string,
    dto: UpsertPaymentMethodSettingsDto,
  ): Promise<PaymentMethodSettings> {
    const method = await this.findMethodById(methodId);

    let record = await this.settingsRepo.findOne({ where: { paymentMethodId: methodId } });
    if (!record) {
      record = this.settingsRepo.create({ paymentMethodId: methodId, settings: {} });
    }

    const sensitive = SENSITIVE_FIELDS[method.code as PaymentMethodCode] ?? [];
    const merged: Record<string, string> = { ...record.settings };
    for (const [key, value] of Object.entries(dto.settings)) {
      if (sensitive.includes(key) && value === MASK) continue;
      merged[key] = value;
    }

    record.settings = merged;
    if (dto.isTestMode !== undefined) record.isTestMode = dto.isTestMode;
    record.isConfigured = this.checkConfigured(merged, method.code);

    return this.settingsRepo.save(record);
  }

  /** Raw (unmasked) credentials for a method — for internal service use only. */
  async getRawSettings(methodCode: PaymentMethodCode): Promise<Record<string, string> | null> {
    const method = await this.methodRepo.findOne({ where: { code: methodCode, isActive: true } });
    if (!method) return null;
    const s = await this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
    return s?.settings ?? null;
  }

  async getMethodSettingsRecord(
    methodCode: PaymentMethodCode,
  ): Promise<PaymentMethodSettings | null> {
    const method = await this.methodRepo.findOne({ where: { code: methodCode, isActive: true } });
    if (!method) return null;
    return this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
  }

  // ── Test Payment ───────────────────────────────────────────────────────────

  async testPayment(
    dto: TestPaymentDto,
    userId: string,
  ): Promise<{
    transaction: PaymentTransaction;
    responseCode: string;
    message: string;
  }> {
    const creds = await this.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException(
        'MoMo (IntouchPay) credentials are not configured. Go to Credentials tab to set them up.',
      );
    }

    const requestTxnId = `TEST-${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
    const settingsRecord = await this.getMethodSettingsRecord(PaymentMethodCode.MOMO_INTOUCH);

    const callbackUrl = `${this.configService.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;

    const result = await this.intouchPay.requestPayment({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      amount: dto.amount,
      mobilePhone: dto.mobilePhone,
      transactionId: requestTxnId,
      callbackUrl: creds.callbackUrl || callbackUrl,
      gatewayUrl: creds.gatewayUrl || undefined,
    });

    const tx = this.txRepo.create({
      requestTransactionId: requestTxnId,
      gatewayTransactionId: result.transactionId || null,
      paymentMethodCode: PaymentMethodCode.MOMO_INTOUCH,
      paymentTypeKey: dto.paymentTypeKey ?? null,
      amount: dto.amount,
      currency: dto.currency ?? 'RWF',
      mobilePhone: dto.mobilePhone,
      status:
        result.status === 'SUCCESSFUL'
          ? PaymentTransactionStatus.SUCCESSFUL
          : result.status === 'FAILED'
            ? PaymentTransactionStatus.FAILED
            : PaymentTransactionStatus.PENDING,
      responseCode: result.responseCode,
      message: result.message,
      isTest: settingsRecord?.isTestMode ?? true,
      initiatedBy: userId,
      completedAt: result.status !== 'PENDING' ? new Date() : null,
    });

    const saved = await this.txRepo.save(tx);

    return {
      transaction: saved,
      responseCode: result.responseCode,
      message: result.message,
    };
  }

  // ── Check transaction status ───────────────────────────────────────────────

  async checkTransactionStatus(txId: string): Promise<{
    transaction: PaymentTransaction;
    gatewayStatus: string;
    message: string;
  }> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status !== PaymentTransactionStatus.PENDING) {
      return { transaction: tx, gatewayStatus: tx.status, message: tx.message ?? '' };
    }

    const creds = await this.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('IntouchPay credentials not configured');
    }

    const statusResult = await this.intouchPay.getTransactionStatus({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      requestTransactionId: tx.requestTransactionId,
      transactionId: tx.gatewayTransactionId ?? '',
      gatewayBaseUrl: creds.gatewayUrl,
    });

    if (statusResult.status !== 'PENDING') {
      tx.status =
        statusResult.status === 'SUCCESSFUL'
          ? PaymentTransactionStatus.SUCCESSFUL
          : PaymentTransactionStatus.FAILED;
      tx.responseCode = statusResult.responseCode;
      tx.message = statusResult.message;
      tx.completedAt = new Date();
      await this.txRepo.save(tx);
    }

    return { transaction: tx, gatewayStatus: statusResult.status, message: statusResult.message };
  }

  // ── List test transactions ─────────────────────────────────────────────────

  async listTransactions(filters: {
    isTest?: boolean;
    status?: string;
    paymentTypeKey?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PaymentTransaction[]; total: number; page: number; limit: number }> {
    const { isTest, status, paymentTypeKey, page = 1, limit = 20 } = filters;
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isTest !== undefined) qb.andWhere('tx.isTest = :isTest', { isTest });
    if (status) qb.andWhere('tx.status = :status', { status });
    if (paymentTypeKey) qb.andWhere('tx.paymentTypeKey = :k', { k: paymentTypeKey });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  // ── Balance Inquiry ────────────────────────────────────────────────────────

  async getAccountBalance(): Promise<{ balance: string; success: boolean; message?: string }> {
    const creds = await this.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('IntouchPay credentials not configured');
    }
    return this.intouchPay.getBalance({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      gatewayBaseUrl: creds.gatewayUrl,
    });
  }

  // ── Webhook: update transaction from callback ──────────────────────────────

  async handleIntouchCallback(payload: Record<string, string>): Promise<{
    requestTransactionId: string;
    transactionId: string;
    resolvedStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    responseCode: string;
    message: string;
  } | null> {
    const requestTxnId = payload['requesttransactionid'];
    const txnId = payload['transactionid'] ?? '';
    const rc = payload['responsecode'] ?? '';
    const status = payload['status'] ?? '';
    const statusDesc = payload['statusdesc'] ?? '';

    if (!requestTxnId) return null;

    const tx = await this.txRepo.findOne({ where: { requestTransactionId: requestTxnId } });
    if (!tx) return null;

    tx.gatewayTransactionId = txnId || tx.gatewayTransactionId;
    tx.responseCode = rc || tx.responseCode;
    tx.message = statusDesc || INTOUCH_RESPONSE_CODES[rc] || status;
    tx.callbackPayload = payload as Record<string, unknown>;

    const resolvedStatus = this.intouchPay.resolveStatus(rc, status);
    if (resolvedStatus !== 'PENDING') {
      tx.status =
        resolvedStatus === 'SUCCESSFUL'
          ? PaymentTransactionStatus.SUCCESSFUL
          : PaymentTransactionStatus.FAILED;
      tx.completedAt = new Date();
    }

    await this.txRepo.save(tx);

    return {
      requestTransactionId: requestTxnId,
      transactionId: txnId,
      resolvedStatus,
      responseCode: rc,
      message: tx.message ?? '',
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private maskSettings(settings: Record<string, string>, code: string): Record<string, string> {
    const sensitive = SENSITIVE_FIELDS[code as PaymentMethodCode] ?? [];
    const masked = { ...settings };
    for (const field of sensitive) {
      if (masked[field]) masked[field] = MASK;
    }
    return masked;
  }

  private checkConfigured(settings: Record<string, string>, code: string): boolean {
    const required: Partial<Record<PaymentMethodCode, string[]>> = {
      [PaymentMethodCode.MOMO_INTOUCH]: ['username', 'partnerPassword', 'accountNo'],
      [PaymentMethodCode.BANK_TRANSFER]: ['bankName', 'accountName', 'accountNumber'],
      [PaymentMethodCode.CARD]: ['provider', 'publishableKey', 'secretKey'],
      [PaymentMethodCode.CASH]: [],
    };
    const fields = required[code as PaymentMethodCode] ?? [];
    return fields.every((f) => !!settings[f]?.trim());
  }
}
