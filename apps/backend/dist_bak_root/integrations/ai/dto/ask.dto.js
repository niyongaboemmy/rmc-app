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
exports.AskDto = exports.ChatMessageDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ChatMessageDto {
}
exports.ChatMessageDto = ChatMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['user', 'assistant'] }),
    (0, class_validator_1.IsIn)(['user', 'assistant']),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Message text' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "content", void 0);
class AskDto {
}
exports.AskDto = AskDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ChatMessageDto], description: 'Conversation history (oldest first)' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(40),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ChatMessageDto),
    __metadata("design:type", Array)
], AskDto.prototype, "messages", void 0);
//# sourceMappingURL=ask.dto.js.map