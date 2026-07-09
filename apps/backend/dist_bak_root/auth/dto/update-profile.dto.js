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
exports.UpdateProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateProfileDto {
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['male', 'female'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['male', 'female']),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'user@example.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Invalid email address' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+250788000001', description: 'Rwanda phone: +250... or 07...' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(\+2507[2389]\d{7}|07[2389]\d{7})$/, {
        message: 'Phone must be a valid Rwanda number (07XXXXXXXX or +250XXXXXXXXX)',
    }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL of profile photo stored on file server' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({}, { message: 'profilePhotoUrl must be a valid URL' }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "profilePhotoUrl", void 0);
//# sourceMappingURL=update-profile.dto.js.map