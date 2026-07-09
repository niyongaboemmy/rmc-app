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
exports.BroadcastDto = exports.CreateSubscriberDto = exports.TestEmailDto = exports.UnsubscribeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UnsubscribeDto {
}
exports.UnsubscribeDto = UnsubscribeDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UnsubscribeDto.prototype, "token", void 0);
class TestEmailDto {
}
exports.TestEmailDto = TestEmailDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], TestEmailDto.prototype, "to", void 0);
class CreateSubscriberDto {
}
exports.CreateSubscriberDto = CreateSubscriberDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSubscriberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['en', 'rw', 'ar'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['en', 'rw', 'ar']),
    __metadata("design:type", String)
], CreateSubscriberDto.prototype, "locale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateSubscriberDto.prototype, "source", void 0);
class BroadcastDto {
}
exports.BroadcastDto = BroadcastDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], BroadcastDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], BroadcastDto.prototype, "html", void 0);
//# sourceMappingURL=subscriber.dto.js.map