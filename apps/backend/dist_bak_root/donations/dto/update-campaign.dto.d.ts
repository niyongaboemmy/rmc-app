import { CreateCampaignDto } from './create-campaign.dto';
declare const UpdateCampaignDto_base: import("@nestjs/common").Type<Partial<CreateCampaignDto>>;
export declare class UpdateCampaignDto extends UpdateCampaignDto_base {
    raisedAmount?: number;
}
export {};
