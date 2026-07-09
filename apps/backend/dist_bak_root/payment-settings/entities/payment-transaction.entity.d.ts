export declare enum PaymentTransactionStatus {
    PENDING = "pending",
    SUCCESSFUL = "successful",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare class PaymentTransaction {
    id: string;
    requestTransactionId: string;
    gatewayTransactionId: string | null;
    paymentMethodCode: string;
    paymentTypeKey: string | null;
    referenceId: string | null;
    amount: number;
    currency: string;
    mobilePhone: string;
    status: PaymentTransactionStatus;
    responseCode: string | null;
    message: string | null;
    callbackPayload: Record<string, unknown> | null;
    isTest: boolean;
    initiatedBy: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
