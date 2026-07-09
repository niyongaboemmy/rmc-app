import { MarriageApplicationStatus } from '../entities/marriage-application.entity';
export declare class UpdateApplicationStatusDto {
    status: MarriageApplicationStatus;
    notes?: string;
    rejectionReason?: string;
    amendmentsRequestedText?: string;
}
