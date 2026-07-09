import { PaymentTypeRate } from './payment-type-rate.entity';
export declare enum PaymentTypeKey {
    DONATION = "DONATION",
    MARRIAGE_FEE = "MARRIAGE_FEE",
    MEMBERSHIP_FEE = "MEMBERSHIP_FEE",
    SCHOOL_FEE = "SCHOOL_FEE",
    EVENT_FEE = "EVENT_FEE",
    ZAKAT = "ZAKAT"
}
export declare class PaymentType {
    id: string;
    name: string;
    key: PaymentTypeKey;
    description: string | null;
    amount: number | null;
    isActive: boolean;
    rates: PaymentTypeRate[];
    createdAt: Date;
    updatedAt: Date;
}
