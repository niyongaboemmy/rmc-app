import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentMethodCode } from './entities/payment-method.entity';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentMethodSettings } from './entities/payment-method-settings.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { UpsertPaymentMethodSettingsDto } from './dto/upsert-payment-method-settings.dto';
import { UpsertPaymentTypeRateDto } from './dto/upsert-payment-type-rate.dto';
import { TestPaymentDto } from './dto/test-payment.dto';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
export declare class PaymentSettingsService {
    private readonly methodRepo;
    private readonly typeRepo;
    private readonly settingsRepo;
    private readonly rateRepo;
    private readonly txRepo;
    private readonly intouchPay;
    private readonly configService;
    constructor(methodRepo: Repository<PaymentMethod>, typeRepo: Repository<PaymentType>, settingsRepo: Repository<PaymentMethodSettings>, rateRepo: Repository<PaymentTypeRate>, txRepo: Repository<PaymentTransaction>, intouchPay: IntouchPayService, configService: ConfigService);
    findAllMethods(): Promise<PaymentMethod[]>;
    findMethodById(id: string): Promise<PaymentMethod>;
    findMethodByCode(code: PaymentMethodCode): Promise<PaymentMethod | null>;
    updateMethod(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod>;
    toggleMethodActive(id: string): Promise<PaymentMethod>;
    findAllTypes(): Promise<PaymentType[]>;
    findTypeById(id: string): Promise<PaymentType>;
    updateType(id: string, dto: UpdatePaymentTypeDto): Promise<PaymentType>;
    toggleTypeActive(id: string): Promise<PaymentType>;
    findTypeRates(typeId: string): Promise<PaymentTypeRate[]>;
    createRate(typeId: string, dto: UpsertPaymentTypeRateDto): Promise<PaymentTypeRate>;
    updateRate(typeId: string, rateId: string, dto: UpsertPaymentTypeRateDto): Promise<PaymentTypeRate>;
    deleteRate(typeId: string, rateId: string): Promise<void>;
    toggleRateActive(typeId: string, rateId: string): Promise<PaymentTypeRate>;
    getRateByCode(typeKey: string, rateCode: string): Promise<PaymentTypeRate | null>;
    getActiveRates(typeKey: string): Promise<PaymentTypeRate[]>;
    getMethodSettings(methodId: string, revealSensitive?: boolean): Promise<PaymentMethodSettings & {
        method: PaymentMethod;
    }>;
    upsertMethodSettings(methodId: string, dto: UpsertPaymentMethodSettingsDto): Promise<PaymentMethodSettings>;
    getRawSettings(methodCode: PaymentMethodCode): Promise<Record<string, string> | null>;
    getMethodSettingsRecord(methodCode: PaymentMethodCode): Promise<PaymentMethodSettings | null>;
    testPayment(dto: TestPaymentDto, userId: string): Promise<{
        transaction: PaymentTransaction;
        responseCode: string;
        message: string;
    }>;
    checkTransactionStatus(txId: string): Promise<{
        transaction: PaymentTransaction;
        gatewayStatus: string;
        message: string;
    }>;
    listTransactions(filters: {
        isTest?: boolean;
        status?: string;
        paymentTypeKey?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        items: PaymentTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
    getAccountBalance(): Promise<{
        balance: string;
        success: boolean;
        message?: string;
    }>;
    handleIntouchCallback(payload: Record<string, string>): Promise<{
        requestTransactionId: string;
        transactionId: string;
        resolvedStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
        responseCode: string;
        message: string;
    } | null>;
    private maskSettings;
    private checkConfigured;
}
