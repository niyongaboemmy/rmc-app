import { DonationsService } from './donations.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
export declare class DonationsAdminController {
    private readonly service;
    constructor(service: DonationsService);
    findAll(dateFrom?: string, dateTo?: string, campaignId?: string, status?: string, search?: string, page?: string, limit?: string, sort?: string, order?: string): Promise<{
        items: import("./entities/donation.entity").Donation[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getDaily(days?: string, currency?: string): Promise<{
        currency: string;
        days: number;
        series: {
            date: string;
            received: number;
            count: number;
        }[];
    }>;
    getStats(dateFrom?: string, dateTo?: string, campaignId?: string, status?: string): Promise<{
        count: any;
        byCurrency: {
            currency: any;
            count: number;
            received: number;
            pending: number;
            total: number;
        }[];
        byProgram: {
            campaignId: any;
            title: any;
            currency: any;
            count: number;
            received: number;
            total: number;
        }[];
        byStatus: {
            status: any;
            count: number;
            total: number;
        }[];
    }>;
    listCampaigns(): Promise<{
        targetAmount: number;
        raisedAmount: number;
        receivedAmount: number;
        donationCount: number;
        id: string;
        title: string;
        slug: string;
        description: string;
        currency: string;
        fundType: string;
        subFundId: string | null;
        startDate: string;
        endDate: string | null;
        heroImageUrl: string | null;
        status: import("./entities/donation-campaign.entity").CampaignStatus;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    listDeletedCampaigns(): Promise<{
        targetAmount: number;
        raisedAmount: number;
        receivedAmount: number;
        donationCount: number;
        id: string;
        title: string;
        slug: string;
        description: string;
        currency: string;
        fundType: string;
        subFundId: string | null;
        startDate: string;
        endDate: string | null;
        heroImageUrl: string | null;
        status: import("./entities/donation-campaign.entity").CampaignStatus;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    createCampaign(dto: CreateCampaignDto, userId: string): Promise<import("./entities/donation-campaign.entity").DonationCampaign>;
    updateCampaign(id: string, dto: UpdateCampaignDto): Promise<import("./entities/donation-campaign.entity").DonationCampaign>;
    deleteCampaign(id: string): Promise<{
        id: string;
    }>;
    restoreCampaign(id: string): Promise<{
        id: string;
    }>;
}
