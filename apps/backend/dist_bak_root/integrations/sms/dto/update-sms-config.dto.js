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
exports.UpdateSmsConfigDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateSmsConfigDto {
}
exports.UpdateSmsConfigDto = UpdateSmsConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'InTouch account username', example: 'RMC' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateSmsConfigDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'InTouch account password (stored encrypted). Send "_KEEP_" to leave unchanged.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateSmsConfigDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sender ID shown to recipients (max 11 chars)', example: 'RMC' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(11),
    __metadata("design:type", String)
], UpdateSmsConfigDto.prototype, "senderName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Delivery report callback URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_tld: false }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateSmsConfigDto.prototype, "dlrUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable or disable SMS sending' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSmsConfigDto.prototype, "isActive", void 0);
//# sourceMappingURL=update-sms-config.dto.js.map