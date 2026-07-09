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
exports.AiSettings = void 0;
const typeorm_1 = require("typeorm");
let AiSettings = class AiSettings {
};
exports.AiSettings = AiSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AiSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'default_provider', type: 'varchar', length: 20, default: 'gemini' }),
    __metadata("design:type", String)
], AiSettings.prototype, "defaultProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'openai_key_enc', type: 'text', default: '' }),
    __metadata("design:type", String)
], AiSettings.prototype, "openaiKeyEnc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gemini_key_enc', type: 'text', default: '' }),
    __metadata("design:type", String)
], AiSettings.prototype, "geminiKeyEnc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'openai_model', type: 'varchar', length: 80, default: 'gpt-4o-mini' }),
    __metadata("design:type", String)
], AiSettings.prototype, "openaiModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gemini_model', type: 'varchar', length: 80, default: 'gemini-2.5-flash' }),
    __metadata("design:type", String)
], AiSettings.prototype, "geminiModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AiSettings.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AiSettings.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AiSettings.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AiSettings.prototype, "updatedAt", void 0);
exports.AiSettings = AiSettings = __decorate([
    (0, typeorm_1.Entity)('ai_settings')
], AiSettings);
//# sourceMappingURL=ai-settings.entity.js.map