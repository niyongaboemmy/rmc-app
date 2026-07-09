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
exports.CreateRoleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const permissions_enum_1 = require("../../common/types/permissions.enum");
class CreateRoleDto {
}
exports.CreateRoleDto = CreateRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Content Manager' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'content_manager' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Manages blog posts and announcements' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: permissions_enum_1.Permission, isArray: true, example: [permissions_enum_1.Permission.CONTENT_CREATE, permissions_enum_1.Permission.CONTENT_EDIT] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(permissions_enum_1.Permission, { each: true }),
    __metadata("design:type", Array)
], CreateRoleDto.prototype, "permissions", void 0);
//# sourceMappingURL=create-role.dto.js.map