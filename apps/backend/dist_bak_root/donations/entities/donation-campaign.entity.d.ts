export declare enum CampaignStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    CLOSED = "closed"
}
export declare class DonationCampaign {
    id: string;
    title: string;
    slug: string;
    description: string;
    targetAmount: number;
    raisedAmount: number;
    currency: string;
    fundType: string;
    subFundId: string | null;
    startDate: string;
    endDate: string | null;
    heroImageUrl: string | null;
    status: CampaignStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
