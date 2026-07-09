import { DonationCampaign } from './donation-campaign.entity';
export declare enum DonationStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum DonationFrequency {
    ONCE = "once",
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
export declare class Donation {
    id: string;
    campaignId: string | null;
    campaign: DonationCampaign | null;
    donorId: string | null;
    donorName: string | null;
    donorEmail: string | null;
    isAnonymous: boolean;
    amount: number;
    currency: string;
    frequency: DonationFrequency;
    paymentMethod: string | null;
    donorPhone: string | null;
    paymentReference: string | null;
    status: DonationStatus;
    nextChargeDate: string | null;
    isActive: boolean;
    message: string | null;
    donatedAt: Date;
    createdAt: Date;
}
