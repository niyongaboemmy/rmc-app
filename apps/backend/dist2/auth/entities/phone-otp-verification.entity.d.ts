export declare class PhoneOtpVerification {
    id: string;
    userId: string;
    phone: string;
    otpHash: string;
    expiresAt: Date;
    verifiedAt: Date | null;
    attempts: number;
    createdAt: Date;
}
