import { Repository } from 'typeorm';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationSubFund } from './entities/donation-subfund.entity';
import { CreateCategoryDto, UpdateCategoryDto, CreateSubFundDto, UpdateSubFundDto } from './dto/category-content.dto';
export declare class DonationCategoriesService {
    private readonly categories;
    private readonly subfunds;
    constructor(categories: Repository<DonationCategory>, subfunds: Repository<DonationSubFund>);
    listPublic(locale: string): Promise<{
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
    adminList(): Promise<DonationCategory[]>;
    private applyTri;
    private applyTriList;
    createCategory(dto: CreateCategoryDto): Promise<DonationCategory>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<DonationCategory>;
    deleteCategory(id: string): Promise<{
        id: string;
    }>;
    adminListDeletedCategories(): Promise<DonationCategory[]>;
    restoreCategory(id: string): Promise<{
        id: string;
    }>;
    createSubFund(categoryId: string, dto: CreateSubFundDto): Promise<DonationSubFund>;
    updateSubFund(id: string, dto: UpdateSubFundDto): Promise<DonationSubFund>;
    deleteSubFund(id: string): Promise<{
        id: string;
    }>;
}
