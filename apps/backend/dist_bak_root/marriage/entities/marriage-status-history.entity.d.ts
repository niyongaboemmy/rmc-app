import { MarriageApplication } from './marriage-application.entity';
export declare class MarriageStatusHistory {
    id: string;
    applicationId: string;
    application: MarriageApplication;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string | null;
    notes: string | null;
    changedAt: Date;
}
