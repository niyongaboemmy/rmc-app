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
exports.UpdateDonationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const donation_entity_1 = require("../entities/donation.entity");
class UpdateDonationDto {
}
exports.UpdateDonationDto = UpdateDonationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateDonationDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: donation_entity_1.DonationStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(donation_entity_1.DonationStatus),
    __metadata("design:type", String)
], UpdateDonationDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: donation_entity_1.DonationFrequency }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(donation_entity_1.DonationFrequency),
    __metadata("design:type", String)
], UpdateDonationDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reassign to a different campaign, or null for the general fund',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], UpdateDonationDto.prototype, "campaignId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateDonationDto.prototype, "donorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateDonationDto.prototype, "donorEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], UpdateDonationDto.prototype, "currency", void 0);
//# sourceMappingURL=update-donation.dto.js.map