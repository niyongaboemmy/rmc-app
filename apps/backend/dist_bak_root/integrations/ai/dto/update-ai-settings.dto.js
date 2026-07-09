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
exports.UpdateAiSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateAiSettingsDto {
}
exports.UpdateAiSettingsDto = UpdateAiSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Provider used by the assistant',
        enum: ['gemini', 'openai'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['gemini', 'openai']),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "defaultProvider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'OpenAI API key. Send "_KEEP_" to leave unchanged, "" to clear.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "openaiKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Google Gemini API key. Send "_KEEP_" to leave unchanged, "" to clear.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "geminiKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Model used when OpenAI is selected',
        example: 'gpt-4o-mini',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "openaiModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Model used when Gemini is selected',
        example: 'gemini-2.5-flash',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "geminiModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable or disable the public assistant' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAiSettingsDto.prototype, "isActive", void 0);
//# sourceMappingURL=update-ai-settings.dto.js.map