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
exports.ApproveMemberDto = exports.ApprovalAction = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ApprovalAction;
(function (ApprovalAction) {
    ApprovalAction["APPROVE"] = "approve";
    ApprovalAction["REJECT"] = "reject";
})(ApprovalAction || (exports.ApprovalAction = ApprovalAction = {}));
class ApproveMemberDto {
}
exports.ApproveMemberDto = ApproveMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApprovalAction }),
    (0, class_validator_1.IsEnum)(ApprovalAction),
    __metadata("design:type", String)
], ApproveMemberDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Required when rejecting' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveMemberDto.prototype, "reason", void 0);
//# sourceMappingURL=approve-member.dto.js.map