import { DonationFrequency } from '../entities/donation.entity';
export declare class CreateDonationDto {
    campaignSlug?: string | null;
    amount: number;
    currency?: string;
    frequency?: DonationFrequency;
    paymentMethod?: string;
    donorName?: string;
    donorEmail?: string;
    donorPhone?: string;
    isAnonymous?: boolean;
    message?: string;
}
