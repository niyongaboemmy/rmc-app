export declare class RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
