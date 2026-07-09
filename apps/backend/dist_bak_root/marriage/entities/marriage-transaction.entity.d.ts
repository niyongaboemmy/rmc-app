import { MarriageApplication } from './marriage-application.entity';
export declare class MarriageTransaction {
    id: string;
    applicationId: string;
    application: MarriageApplication;
    method: string;
    providerRef: string | null;
    amount: number;
    currency: string;
    status: string;
    initiatedAt: Date;
    completedAt: Date | null;
    confirmedBy: string | null;
    metadata: Record<string, unknown> | null;
}
