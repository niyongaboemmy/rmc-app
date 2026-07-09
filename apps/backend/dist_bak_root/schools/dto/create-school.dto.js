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
exports.CreateSchoolDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const school_entity_1 = require("../entities/school.entity");
class CreateSchoolDto {
}
exports.CreateSchoolDto = CreateSchoolDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: school_entity_1.SchoolLevel }),
    (0, class_validator_1.IsEnum)(school_entity_1.SchoolLevel),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "principalName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Human-readable location, e.g. "Nyarugenge, Kigali"' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "district", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Province code: KIG, NOR, SOU, EAS, WES' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "provinceCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CreateSchoolDto.prototype, "gpsLat", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CreateSchoolDto.prototype, "gpsLng", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: school_entity_1.SchoolStatus, default: school_entity_1.SchoolStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(school_entity_1.SchoolStatus),
    __metadata("design:type", String)
], CreateSchoolDto.prototype, "status", void 0);
//# sourceMappingURL=create-school.dto.js.map