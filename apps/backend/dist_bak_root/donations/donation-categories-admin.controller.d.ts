import { DonationCategoriesService } from './donation-categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateSubFundDto, UpdateSubFundDto } from './dto/category-content.dto';
export declare class DonationCategoriesAdminController {
    private readonly service;
    constructor(service: DonationCategoriesService);
    list(): Promise<import("./entities/donation-category.entity").DonationCategory[]>;
    listDeleted(): Promise<import("./entities/donation-category.entity").DonationCategory[]>;
    createCategory(dto: CreateCategoryDto): Promise<import("./entities/donation-category.entity").DonationCategory>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<import("./entities/donation-category.entity").DonationCategory>;
    deleteCategory(id: string): Promise<{
        id: string;
    }>;
    restoreCategory(id: string): Promise<{
        id: string;
    }>;
    createSubFund(categoryId: string, dto: CreateSubFundDto): Promise<import("./entities/donation-subfund.entity").DonationSubFund>;
    updateSubFund(subId: string, dto: UpdateSubFundDto): Promise<import("./entities/donation-subfund.entity").DonationSubFund>;
    deleteSubFund(subId: string): Promise<{
        id: string;
    }>;
}
