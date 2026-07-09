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
exports.UpdateRoleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const permissions_enum_1 = require("../../common/types/permissions.enum");
class UpdateRoleDto {
}
exports.UpdateRoleDto = UpdateRoleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Content Manager' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'content_manager' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Manages blog posts and announcements' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: permissions_enum_1.Permission, isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(permissions_enum_1.Permission, { each: true }),
    __metadata("design:type", Array)
], UpdateRoleDto.prototype, "permissions", void 0);
//# sourceMappingURL=update-role.dto.js.map