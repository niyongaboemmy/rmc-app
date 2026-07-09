import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
export declare class DonationsController {
    private readonly service;
    constructor(service: DonationsService);
    listCampaigns(): Promise<{
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
    create(dto: CreateDonationDto, userId: string | undefined): Promise<import("./entities/donation.entity").Donation>;
    checkStatus(id: string): Promise<import("./entities/donation.entity").Donation>;
}
