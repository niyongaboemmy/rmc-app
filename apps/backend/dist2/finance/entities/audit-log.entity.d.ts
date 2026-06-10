export declare class AuditLog {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    actorRole: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    performedAt: Date;
}
