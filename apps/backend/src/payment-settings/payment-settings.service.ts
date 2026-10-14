import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, PaymentMethodCode } from './entities/payment-method.entity';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentMethodSettings } from './entities/payment-method-settings.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { UpsertPaymentMethodSettingsDto } from './dto/upsert-payment-method-settings.dto';
import { UpsertPaymentTypeRateDto } from './dto/upsert-payment-type-rate.dto';
import { SettingsCacheBus } from './settings-cache.bus';
import { IREMBOPAY_SENSITIVE_FIELDS, iremboPayReady } from './irembopay-fields';

const SENSITIVE_FIELDS: Partial<Record<PaymentMethodCode, string[]>> = {
  [PaymentMethodCode.IREMBOPAY]: IREMBOPAY_SENSITIVE_FIELDS,
};

const MASK = '••••••••';

@Injectable()
export class PaymentSettingsService {
  private readonly logger = new Logger(PaymentSettingsService.name);

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

    private readonly cacheBus: SettingsCacheBus,
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
    // Retired: key provenance was needed only while one set of fields held
    // whichever merchant's keys; each merchant now has its own fields.
    delete merged.credentialsFor;

    record.settings = merged;
    if (dto.isTestMode !== undefined) record.isTestMode = dto.isTestMode;
    record.isConfigured = this.checkConfigured(merged, method.code, record.isTestMode);

    const saved = await this.settingsRepo.save(record);

    // Provider config caches read these values; without this a saved key would
    // not take effect until the cache expired, and the admin would conclude the
    // save had not worked.
    this.cacheBus.emitMethodSettingsChanged(method.code as PaymentMethodCode);

    return saved;
  }

  /**
   * Raw (unmasked) credentials for a method — for internal service use only.
   *
   * `requireActive` defaults to true, which is right for *starting* a payment:
   * a disabled method must not take new money. It must be passed `false` when
   * settling money that is already in flight — verifying a webhook signature or
   * reconciling an issued invoice. Deactivating a method is how this system
   * rolls a provider back, and callbacks for invoices issued before the rollback
   * keep arriving afterwards; refusing to read the key then would silently drop
   * real payments.
   */
  async getRawSettings(
    methodCode: PaymentMethodCode,
    requireActive = true,
  ): Promise<Record<string, string> | null> {
    const method = await this.findMethodForSettings(methodCode, requireActive);
    if (!method) return null;
    const s = await this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
    return s?.settings ?? null;
  }

  /** See `getRawSettings` for what `requireActive` means and when to pass false. */
  async getMethodSettingsRecord(
    methodCode: PaymentMethodCode,
    requireActive = true,
  ): Promise<PaymentMethodSettings | null> {
    const method = await this.findMethodForSettings(methodCode, requireActive);
    if (!method) return null;
    return this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
  }

  private findMethodForSettings(
    methodCode: PaymentMethodCode,
    requireActive: boolean,
  ): Promise<PaymentMethod | null> {
    return this.methodRepo.findOne({
      where: requireActive ? { code: methodCode, isActive: true } : { code: methodCode },
    });
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private maskSettings(settings: Record<string, string>, code: string): Record<string, string> {
    const sensitive = SENSITIVE_FIELDS[code as PaymentMethodCode] ?? [];
    const masked = { ...settings };
    for (const field of sensitive) {
      if (masked[field]) masked[field] = MASK;
    }
    return masked;
  }

  /** Configured for the merchant the Test-mode flag selects. */
  private checkConfigured(
    settings: Record<string, string>,
    code: string,
    isTestMode: boolean,
  ): boolean {
    if (code === PaymentMethodCode.IREMBOPAY) {
      return iremboPayReady(settings, isTestMode ? 'sandbox' : 'production');
    }
    return false;
  }
}
