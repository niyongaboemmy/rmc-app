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
exports.TestPaymentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class TestPaymentDto {
}
exports.TestPaymentDto = TestPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '250788000000', description: 'Mobile phone number to charge' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TestPaymentDto.prototype, "mobilePhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Amount in RWF' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TestPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'MARRIAGE_FEE',
        description: 'Payment type key for categorisation',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestPaymentDto.prototype, "paymentTypeKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'RWF' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestPaymentDto.prototype, "currency", void 0);
//# sourceMappingURL=test-payment.dto.js.map