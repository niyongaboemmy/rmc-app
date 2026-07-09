import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Donation } from './entities/donation.entity';
import { DonationCampaign, CampaignStatus } from './entities/donation-campaign.entity';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
export interface DonationFilters {
    dateFrom?: string;
    dateTo?: string;
    campaignId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
}
export declare class DonationsService {
    private readonly donations;
    private readonly campaigns;
    private readonly intouchPay;
    private readonly paymentSettings;
    private readonly smsService;
    private readonly configService;
    constructor(donations: Repository<Donation>, campaigns: Repository<DonationCampaign>, intouchPay: IntouchPayService, paymentSettings: PaymentSettingsService, smsService: SmsService, configService: ConfigService);
    listPublicCampaigns(): Promise<{
        id: string;
        slug: string;
        title: string;
        description: string;
        targetAmount: number;
        receivedAmount: number;
        currency: string;
        fundType: string;
        subFundId: string | null;
        heroImageUrl: string | null;
        startDate: string;
        endDate: string | null;
    }[]>;
    create(dto: CreateDonationDto, donorId: string | null): Promise<Donation>;
    refreshPaymentStatus(id: string): Promise<Donation>;
    private applyFilters;
    adminFindAll(filters: DonationFilters): Promise<{
        items: Donation[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminGetDailyReceived(days?: number, currency?: string): Promise<{
        currency: string;
        days: number;
        series: {
            date: string;
            received: number;
            count: number;
        }[];
    }>;
    adminGetStats(filters: DonationFilters): Promise<{
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
    adminUpdateDonation(id: string, dto: UpdateDonationDto): Promise<Donation>;
    private getReceivedMap;
    adminListCampaigns(): Promise<{
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
        status: CampaignStatus;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    adminListDeletedCampaigns(): Promise<{
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
        status: CampaignStatus;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    restoreCampaign(id: string): Promise<{
        id: string;
    }>;
    private slugify;
    private uniqueSlug;
    createCampaign(dto: CreateCampaignDto, userId: string): Promise<DonationCampaign>;
    updateCampaign(id: string, dto: UpdateCampaignDto): Promise<DonationCampaign>;
    deleteCampaign(id: string): Promise<{
        id: string;
    }>;
}
