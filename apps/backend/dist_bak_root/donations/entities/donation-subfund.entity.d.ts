import { DonationCategory, CategoryStatus } from './donation-category.entity';
export declare class DonationSubFund {
    id: string;
    categoryId: string;
    category: DonationCategory;
    key: string;
    image: string | null;
    campaignSlug: string | null;
    labelEn: string;
    labelRw: string;
    labelAr: string;
    longEn: string;
    longRw: string;
    longAr: string;
    impactEn: string;
    impactRw: string;
    impactAr: string;
    examplesEn: string[];
    examplesRw: string[];
    examplesAr: string[];
    sortOrder: number;
    status: CategoryStatus;
    createdAt: Date;
    updatedAt: Date;
}
