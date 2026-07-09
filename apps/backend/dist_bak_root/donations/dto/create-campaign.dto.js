"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCampaignDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const donation_campaign_entity_1 = require("../entities/donation-campaign.entity");
class CreateCampaignDto {
}
exports.CreateCampaignDto = CreateCampaignDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL slug; auto-derived from the title when omitted' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCampaignDto.prototype, "targetAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'RWF' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'general' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "fundType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sub-fund this program belongs to (UUID); null for category-level programs' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "subFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "heroImageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: donation_campaign_entity_1.CampaignStatus, default: donation_campaign_entity_1.CampaignStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(donation_campaign_entity_1.CampaignStatus),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "status", void 0);
//# sourceMappingURL=create-campaign.dto.js.map