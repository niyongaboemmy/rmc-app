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
exports.AssignRoleDto = exports.UpdateUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateUserDto {
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\+2507[2389]\d{7}$/),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['male', 'female'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['male', 'female']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['active', 'pending', 'suspended', 'inactive'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['active', 'pending', 'suspended', 'inactive']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Profile photo URL from file server' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({}, { message: 'profilePhotoUrl must be a valid URL' }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "profilePhotoUrl", void 0);
class AssignRoleDto {
}
exports.AssignRoleDto = AssignRoleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Role ID (null to unassign)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], AssignRoleDto.prototype, "roleId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['user', 'operator', 'admin', 'superadmin'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['user', 'operator', 'admin', 'superadmin']),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "role", void 0);
//# sourceMappingURL=update-user.dto.js.map