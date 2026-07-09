import { DonationStatus, DonationFrequency } from '../entities/donation.entity';
export declare class UpdateDonationDto {
    amount?: number;
    status?: DonationStatus;
    frequency?: DonationFrequency;
    campaignId?: string | null;
    donorName?: string;
    donorEmail?: string;
    currency?: string;
}
