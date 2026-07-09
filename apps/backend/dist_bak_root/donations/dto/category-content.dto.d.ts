export interface TriText {
    en?: string;
    rw?: string;
    ar?: string;
}
export interface TriList {
    en?: string[];
    rw?: string[];
    ar?: string[];
}
export declare class CreateCategoryDto {
    key: string;
    icon?: string;
    tone?: string;
    image?: string;
    title?: TriText;
    desc?: TriText;
    long?: TriText;
    impact?: TriText;
    sortOrder?: number;
    status?: string;
}
declare const UpdateCategoryDto_base: import("@nestjs/common").Type<Partial<CreateCategoryDto>>;
export declare class UpdateCategoryDto extends UpdateCategoryDto_base {
}
export declare class CreateSubFundDto {
    key: string;
    image?: string;
    campaignSlug?: string | null;
    label?: TriText;
    long?: TriText;
    impact?: TriText;
    examples?: TriList;
    sortOrder?: number;
    status?: string;
}
declare const UpdateSubFundDto_base: import("@nestjs/common").Type<Partial<CreateSubFundDto>>;
export declare class UpdateSubFundDto extends UpdateSubFundDto_base {
}
export {};
