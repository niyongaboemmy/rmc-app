import { PaymentMethod } from './payment-method.entity';
export declare class PaymentMethodSettings {
    id: string;
    paymentMethodId: string;
    paymentMethod: PaymentMethod;
    settings: Record<string, string>;
    isTestMode: boolean;
    isConfigured: boolean;
    createdAt: Date;
    updatedAt: Date;
}
