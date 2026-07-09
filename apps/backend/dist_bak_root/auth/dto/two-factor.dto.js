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
exports.TwoFactorResendDto = exports.TwoFactorVerifyLoginDto = exports.TwoFactorDisableDto = exports.TwoFactorVerifySetupDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class TwoFactorVerifySetupDto {
}
exports.TwoFactorVerifySetupDto = TwoFactorVerifySetupDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456', description: '6-digit OTP sent to phone' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], TwoFactorVerifySetupDto.prototype, "otp", void 0);
class TwoFactorDisableDto {
}
exports.TwoFactorDisableDto = TwoFactorDisableDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'myPassword123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TwoFactorDisableDto.prototype, "password", void 0);
class TwoFactorVerifyLoginDto {
}
exports.TwoFactorVerifyLoginDto = TwoFactorVerifyLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Temporary token received after credentials step' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TwoFactorVerifyLoginDto.prototype, "tempToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456', description: '6-digit OTP sent to phone' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], TwoFactorVerifyLoginDto.prototype, "otp", void 0);
class TwoFactorResendDto {
}
exports.TwoFactorResendDto = TwoFactorResendDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Temporary token received after credentials step' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TwoFactorResendDto.prototype, "tempToken", void 0);
//# sourceMappingURL=two-factor.dto.js.map