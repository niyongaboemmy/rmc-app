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
exports.CreateMarriageApplicationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const marriage_application_entity_1 = require("../entities/marriage-application.entity");
const nid = (0, class_validator_1.Matches)(/^\d{16}$/, { message: 'Must be exactly 16 digits' });
const blankToUndefined = (0, class_transformer_1.Transform)(({ value }) => value === '' ? undefined : value);
class CreateMarriageApplicationDto {
}
exports.CreateMarriageApplicationDto = CreateMarriageApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "notificationPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "groomName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "groomFatherName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    nid,
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "groomNid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "groomBirthDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "groomPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "brideName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "brideFatherName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    nid,
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "brideNid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "brideBirthDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "bridePhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    nid,
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "witness1Nid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "witness1Name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    nid,
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "witness2Nid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "witness2Name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "waliName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d{16}$/),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "waliNid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "waliPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMarriageApplicationDto.prototype, "mahrAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "mahrDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 150),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "requestedOfficiant", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: marriage_application_entity_1.VenueType }),
    (0, class_validator_1.IsEnum)(marriage_application_entity_1.VenueType),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "venueType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "district", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "mosqueId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "venueAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "preferredDateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    blankToUndefined,
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "preferredDateTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEnum)(['momo', 'bank', 'cash']),
    __metadata("design:type", String)
], CreateMarriageApplicationDto.prototype, "paymentMethod", void 0);
//# sourceMappingURL=create-marriage-application.dto.js.map