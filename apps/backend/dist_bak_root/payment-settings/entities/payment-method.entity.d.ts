export declare enum PaymentMethodCode {
    MOMO_INTOUCH = "MOMO_INTOUCH",
    BANK_TRANSFER = "BANK_TRANSFER",
    CARD = "CARD",
    CASH = "CASH"
}
export declare class PaymentMethod {
    id: string;
    name: string;
    code: PaymentMethodCode;
    description: string | null;
    isActive: boolean;
    logoUrl: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
