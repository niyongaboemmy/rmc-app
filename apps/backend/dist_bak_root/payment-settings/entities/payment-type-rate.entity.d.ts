import { PaymentType } from './payment-type.entity';
export declare class PaymentTypeRate {
    id: string;
    paymentTypeId: string;
    paymentType: PaymentType;
    code: string | null;
    name: string;
    description: string | null;
    amount: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
