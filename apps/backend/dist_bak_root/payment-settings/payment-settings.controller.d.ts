import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentEventsService } from './payment-events.service';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { UpsertPaymentMethodSettingsDto } from './dto/upsert-payment-method-settings.dto';
import { UpsertPaymentTypeRateDto } from './dto/upsert-payment-type-rate.dto';
import { TestPaymentDto } from './dto/test-payment.dto';
import { User } from '../users/entities/user.entity';
export declare class PaymentSettingsController {
    private readonly service;
    private readonly events;
    constructor(service: PaymentSettingsService, events: PaymentEventsService);
    findAllMethods(): Promise<import("./entities/payment-method.entity").PaymentMethod[]>;
    updateMethod(id: string, dto: UpdatePaymentMethodDto): Promise<import("./entities/payment-method.entity").PaymentMethod>;
    toggleMethod(id: string): Promise<import("./entities/payment-method.entity").PaymentMethod>;
    findAllTypes(): Promise<import("./entities/payment-type.entity").PaymentType[]>;
    updateType(id: string, dto: UpdatePaymentTypeDto): Promise<import("./entities/payment-type.entity").PaymentType>;
    toggleType(id: string): Promise<import("./entities/payment-type.entity").PaymentType>;
    listRates(id: string): Promise<import("./entities/payment-type-rate.entity").PaymentTypeRate[]>;
    createRate(id: string, dto: UpsertPaymentTypeRateDto): Promise<import("./entities/payment-type-rate.entity").PaymentTypeRate>;
    updateRate(id: string, rateId: string, dto: UpsertPaymentTypeRateDto): Promise<import("./entities/payment-type-rate.entity").PaymentTypeRate>;
    toggleRate(id: string, rateId: string): Promise<import("./entities/payment-type-rate.entity").PaymentTypeRate>;
    deleteRate(id: string, rateId: string): Promise<void>;
    getMethodSettings(id: string, reveal?: string): Promise<import("./entities/payment-method-settings.entity").PaymentMethodSettings & {
        method: import("./entities/payment-method.entity").PaymentMethod;
    }>;
    upsertMethodSettings(id: string, dto: UpsertPaymentMethodSettingsDto): Promise<import("./entities/payment-method-settings.entity").PaymentMethodSettings>;
    testPayment(user: User, dto: TestPaymentDto): Promise<{
        transaction: import("./entities/payment-transaction.entity").PaymentTransaction;
        responseCode: string;
        message: string;
    }>;
    checkPaymentStatus(txId: string): Promise<{
        transaction: import("./entities/payment-transaction.entity").PaymentTransaction;
        gatewayStatus: string;
        message: string;
    }>;
    listTransactions(isTest?: string, status?: string, paymentTypeKey?: string, page?: string, limit?: string): Promise<{
        items: import("./entities/payment-transaction.entity").PaymentTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
    getBalance(): Promise<{
        balance: string;
        success: boolean;
        message?: string;
    }>;
    paymentEvents(): Observable<MessageEvent>;
}
