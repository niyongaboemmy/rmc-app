"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const payment_method_entity_1 = require("./entities/payment-method.entity");
const payment_type_entity_1 = require("./entities/payment-type.entity");
const payment_type_rate_entity_1 = require("./entities/payment-type-rate.entity");
const payment_method_settings_entity_1 = require("./entities/payment-method-settings.entity");
const payment_transaction_entity_1 = require("./entities/payment-transaction.entity");
const intouch_pay_service_1 = require("../integrations/intouch-pay/intouch-pay.service");
const crypto = require("crypto");
const SENSITIVE_FIELDS = {
    [payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH]: ['partnerPassword'],
    [payment_method_entity_1.PaymentMethodCode.CARD]: ['secretKey', 'webhookSecret'],
};
const MASK = '••••••••';
let PaymentSettingsService = class PaymentSettingsService {
    constructor(methodRepo, typeRepo, settingsRepo, rateRepo, txRepo, intouchPay, configService) {
        this.methodRepo = methodRepo;
        this.typeRepo = typeRepo;
        this.settingsRepo = settingsRepo;
        this.rateRepo = rateRepo;
        this.txRepo = txRepo;
        this.intouchPay = intouchPay;
        this.configService = configService;
    }
    findAllMethods() {
        return this.methodRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    }
    async findMethodById(id) {
        const method = await this.methodRepo.findOne({ where: { id } });
        if (!method)
            throw new common_1.NotFoundException(`Payment method ${id} not found`);
        return method;
    }
    async findMethodByCode(code) {
        return this.methodRepo.findOne({ where: { code } });
    }
    async updateMethod(id, dto) {
        const method = await this.findMethodById(id);
        Object.assign(method, dto);
        return this.methodRepo.save(method);
    }
    async toggleMethodActive(id) {
        const method = await this.findMethodById(id);
        method.isActive = !method.isActive;
        return this.methodRepo.save(method);
    }
    findAllTypes() {
        return this.typeRepo.find({
            order: { createdAt: 'ASC' },
            relations: ['rates'],
        });
    }
    async findTypeById(id) {
        const type = await this.typeRepo.findOne({ where: { id }, relations: ['rates'] });
        if (!type)
            throw new common_1.NotFoundException(`Payment type ${id} not found`);
        return type;
    }
    async updateType(id, dto) {
        const type = await this.findTypeById(id);
        if (dto.name !== undefined)
            type.name = dto.name;
        if (dto.description !== undefined)
            type.description = dto.description;
        if (dto.amount !== undefined)
            type.amount = dto.amount;
        return this.typeRepo.save(type);
    }
    async toggleTypeActive(id) {
        const type = await this.findTypeById(id);
        type.isActive = !type.isActive;
        return this.typeRepo.save(type);
    }
    async findTypeRates(typeId) {
        await this.findTypeById(typeId);
        return this.rateRepo.find({
            where: { paymentTypeId: typeId },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }
    async createRate(typeId, dto) {
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
    async updateRate(typeId, rateId, dto) {
        const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
        if (!rate)
            throw new common_1.NotFoundException(`Rate ${rateId} not found`);
        if (dto.name !== undefined)
            rate.name = dto.name;
        if (dto.description !== undefined)
            rate.description = dto.description ?? null;
        if (dto.amount !== undefined)
            rate.amount = dto.amount;
        if (dto.isActive !== undefined)
            rate.isActive = dto.isActive;
        if (dto.sortOrder !== undefined)
            rate.sortOrder = dto.sortOrder;
        if (dto.code !== undefined)
            rate.code = dto.code ?? null;
        return this.rateRepo.save(rate);
    }
    async deleteRate(typeId, rateId) {
        const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
        if (!rate)
            throw new common_1.NotFoundException(`Rate ${rateId} not found`);
        await this.rateRepo.remove(rate);
    }
    async toggleRateActive(typeId, rateId) {
        const rate = await this.rateRepo.findOne({ where: { id: rateId, paymentTypeId: typeId } });
        if (!rate)
            throw new common_1.NotFoundException(`Rate ${rateId} not found`);
        rate.isActive = !rate.isActive;
        return this.rateRepo.save(rate);
    }
    async getRateByCode(typeKey, rateCode) {
        const type = await this.typeRepo.findOne({ where: { key: typeKey } });
        if (!type)
            return null;
        return this.rateRepo.findOne({
            where: { paymentTypeId: type.id, code: rateCode, isActive: true },
        });
    }
    async getActiveRates(typeKey) {
        const type = await this.typeRepo.findOne({ where: { key: typeKey } });
        if (!type)
            return [];
        return this.rateRepo.find({
            where: { paymentTypeId: type.id, isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }
    async getMethodSettings(methodId, revealSensitive = false) {
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
    async upsertMethodSettings(methodId, dto) {
        const method = await this.findMethodById(methodId);
        let record = await this.settingsRepo.findOne({ where: { paymentMethodId: methodId } });
        if (!record) {
            record = this.settingsRepo.create({ paymentMethodId: methodId, settings: {} });
        }
        const sensitive = SENSITIVE_FIELDS[method.code] ?? [];
        const merged = { ...record.settings };
        for (const [key, value] of Object.entries(dto.settings)) {
            if (sensitive.includes(key) && value === MASK)
                continue;
            merged[key] = value;
        }
        record.settings = merged;
        if (dto.isTestMode !== undefined)
            record.isTestMode = dto.isTestMode;
        record.isConfigured = this.checkConfigured(merged, method.code);
        return this.settingsRepo.save(record);
    }
    async getRawSettings(methodCode) {
        const method = await this.methodRepo.findOne({ where: { code: methodCode, isActive: true } });
        if (!method)
            return null;
        const s = await this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
        return s?.settings ?? null;
    }
    async getMethodSettingsRecord(methodCode) {
        const method = await this.methodRepo.findOne({ where: { code: methodCode, isActive: true } });
        if (!method)
            return null;
        return this.settingsRepo.findOne({ where: { paymentMethodId: method.id } });
    }
    async testPayment(dto, userId) {
        const creds = await this.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('MoMo (IntouchPay) credentials are not configured. Go to Credentials tab to set them up.');
        }
        const requestTxnId = `TEST-${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
        const settingsRecord = await this.getMethodSettingsRecord(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
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
            paymentMethodCode: payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH,
            paymentTypeKey: dto.paymentTypeKey ?? null,
            amount: dto.amount,
            currency: dto.currency ?? 'RWF',
            mobilePhone: dto.mobilePhone,
            status: result.status === 'SUCCESSFUL'
                ? payment_transaction_entity_1.PaymentTransactionStatus.SUCCESSFUL
                : result.status === 'FAILED'
                    ? payment_transaction_entity_1.PaymentTransactionStatus.FAILED
                    : payment_transaction_entity_1.PaymentTransactionStatus.PENDING,
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
    async checkTransactionStatus(txId) {
        const tx = await this.txRepo.findOne({ where: { id: txId } });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        if (tx.status !== payment_transaction_entity_1.PaymentTransactionStatus.PENDING) {
            return { transaction: tx, gatewayStatus: tx.status, message: tx.message ?? '' };
        }
        const creds = await this.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('IntouchPay credentials not configured');
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
                    ? payment_transaction_entity_1.PaymentTransactionStatus.SUCCESSFUL
                    : payment_transaction_entity_1.PaymentTransactionStatus.FAILED;
            tx.responseCode = statusResult.responseCode;
            tx.message = statusResult.message;
            tx.completedAt = new Date();
            await this.txRepo.save(tx);
        }
        return { transaction: tx, gatewayStatus: statusResult.status, message: statusResult.message };
    }
    async listTransactions(filters) {
        const { isTest, status, paymentTypeKey, page = 1, limit = 20 } = filters;
        const qb = this.txRepo
            .createQueryBuilder('tx')
            .orderBy('tx.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (isTest !== undefined)
            qb.andWhere('tx.isTest = :isTest', { isTest });
        if (status)
            qb.andWhere('tx.status = :status', { status });
        if (paymentTypeKey)
            qb.andWhere('tx.paymentTypeKey = :k', { k: paymentTypeKey });
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit };
    }
    async getAccountBalance() {
        const creds = await this.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('IntouchPay credentials not configured');
        }
        return this.intouchPay.getBalance({
            username: creds.username,
            partnerPassword: creds.partnerPassword,
            accountNo: creds.accountNo,
            gatewayBaseUrl: creds.gatewayUrl,
        });
    }
    async handleIntouchCallback(payload) {
        const requestTxnId = payload['requesttransactionid'];
        const txnId = payload['transactionid'] ?? '';
        const rc = payload['responsecode'] ?? '';
        const status = payload['status'] ?? '';
        const statusDesc = payload['statusdesc'] ?? '';
        if (!requestTxnId)
            return null;
        const tx = await this.txRepo.findOne({ where: { requestTransactionId: requestTxnId } });
        if (!tx)
            return null;
        tx.gatewayTransactionId = txnId || tx.gatewayTransactionId;
        tx.responseCode = rc || tx.responseCode;
        tx.message = statusDesc || intouch_pay_service_1.INTOUCH_RESPONSE_CODES[rc] || status;
        tx.callbackPayload = payload;
        const resolvedStatus = this.intouchPay.resolveStatus(rc, status);
        if (resolvedStatus !== 'PENDING') {
            tx.status =
                resolvedStatus === 'SUCCESSFUL'
                    ? payment_transaction_entity_1.PaymentTransactionStatus.SUCCESSFUL
                    : payment_transaction_entity_1.PaymentTransactionStatus.FAILED;
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
    maskSettings(settings, code) {
        const sensitive = SENSITIVE_FIELDS[code] ?? [];
        const masked = { ...settings };
        for (const field of sensitive) {
            if (masked[field])
                masked[field] = MASK;
        }
        return masked;
    }
    checkConfigured(settings, code) {
        const required = {
            [payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH]: ['username', 'partnerPassword', 'accountNo'],
            [payment_method_entity_1.PaymentMethodCode.BANK_TRANSFER]: ['bankName', 'accountName', 'accountNumber'],
            [payment_method_entity_1.PaymentMethodCode.CARD]: ['provider', 'publishableKey', 'secretKey'],
            [payment_method_entity_1.PaymentMethodCode.CASH]: [],
        };
        const fields = required[code] ?? [];
        return fields.every((f) => !!settings[f]?.trim());
    }
};
exports.PaymentSettingsService = PaymentSettingsService;
exports.PaymentSettingsService = PaymentSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_method_entity_1.PaymentMethod)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_type_entity_1.PaymentType)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_method_settings_entity_1.PaymentMethodSettings)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_type_rate_entity_1.PaymentTypeRate)),
    __param(4, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        intouch_pay_service_1.IntouchPayService,
        config_1.ConfigService])
], PaymentSettingsService);
//# sourceMappingURL=payment-settings.service.js.map