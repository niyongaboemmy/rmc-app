import { CampaignStatus } from '../entities/donation-campaign.entity';
export declare class CreateCampaignDto {
    title: string;
    slug?: string;
    description: string;
    targetAmount: number;
    currency?: string;
    fundType?: string;
    subFundId?: string | null;
    startDate?: string;
    endDate?: string | null;
    heroImageUrl?: string | null;
    status?: CampaignStatus;
}
