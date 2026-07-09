export interface IntouchPayRequest {
    username: string;
    partnerPassword: string;
    accountNo: string;
    amount: number;
    mobilePhone: string;
    transactionId: string;
    reason?: string;
    callbackUrl?: string;
    gatewayUrl?: string;
}
export interface IntouchPayResult {
    requestTransactionId: string;
    transactionId: string;
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    responseCode: string;
    message: string;
    raw?: Record<string, unknown>;
}
export interface IntouchPayStatusResult {
    requestTransactionId: string;
    transactionId: string;
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    responseCode: string;
    message: string;
}
export interface IntouchPayBalanceResult {
    balance: string;
    success: boolean;
    responseCode?: string;
    message?: string;
}
export declare const INTOUCH_RESPONSE_CODES: Record<string, string>;
export declare const DEFAULT_DEPOSIT_URL = "https://www.intouchpay.co.rw/api/requestdeposit/";
export declare class IntouchPayService {
    private readonly logger;
    requestPayment(req: IntouchPayRequest): Promise<IntouchPayResult>;
    getTransactionStatus(opts: {
        username: string;
        partnerPassword: string;
        accountNo: string;
        requestTransactionId: string;
        transactionId: string;
        gatewayBaseUrl?: string;
    }): Promise<IntouchPayStatusResult>;
    getBalance(opts: {
        username: string;
        partnerPassword: string;
        accountNo: string;
        gatewayBaseUrl?: string;
    }): Promise<IntouchPayBalanceResult>;
    normalizePhone(phone: string): string;
    buildTimestamp(): string;
    generatePassword(username: string, accountNo: string, partnerPassword: string, timestamp: string): string;
    resolveStatus(responseCode: string, statusText: string): 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    private formPost;
}
