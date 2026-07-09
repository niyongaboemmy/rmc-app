import { DonationCategoriesService } from './donation-categories.service';
export declare class DonationCategoriesController {
    private readonly service;
    constructor(service: DonationCategoriesService);
    list(locale?: string): Promise<{
        id: string;
        key: string;
        icon: string;
        tone: string;
        image: string | null;
        title: string;
        desc: string;
        long: string;
        impact: string;
        subfunds: {
            id: string;
            key: string;
            image: string | null;
            campaignSlug: string | null;
            label: string;
            long: string;
            impact: string;
            examples: string[];
        }[];
    }[]>;
}
