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
exports.CreateDonationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const donation_entity_1 = require("../entities/donation.entity");
class CreateDonationDto {
}
exports.CreateDonationDto = CreateDonationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Slug of the campaign/program, or null for the general fund',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], CreateDonationDto.prototype, "campaignSlug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateDonationDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'RWF' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: donation_entity_1.DonationFrequency, default: donation_entity_1.DonationFrequency.ONCE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(donation_entity_1.DonationFrequency),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "donorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "donorEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Payer mobile number (required for Mobile Money)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "donorPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateDonationDto.prototype, "isAnonymous", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDonationDto.prototype, "message", void 0);
//# sourceMappingURL=create-donation.dto.js.map