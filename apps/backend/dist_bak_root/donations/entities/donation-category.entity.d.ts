import { DonationSubFund } from './donation-subfund.entity';
export type CategoryStatus = 'active' | 'inactive';
export declare class DonationCategory {
    id: string;
    key: string;
    icon: string;
    tone: string;
    image: string | null;
    titleEn: string;
    titleRw: string;
    titleAr: string;
    descEn: string;
    descRw: string;
    descAr: string;
    longEn: string;
    longRw: string;
    longAr: string;
    impactEn: string;
    impactRw: string;
    impactAr: string;
    sortOrder: number;
    status: CategoryStatus;
    subfunds: DonationSubFund[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
