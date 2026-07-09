"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ai_settings_entity_1 = require("./entities/ai-settings.entity");
const mosque_entity_1 = require("../../mosques/entities/mosque.entity");
const ai_settings_service_1 = require("./ai-settings.service");
const ai_chat_service_1 = require("./ai-chat.service");
const ai_context_service_1 = require("./ai-context.service");
const ai_settings_admin_controller_1 = require("./ai-settings-admin.controller");
const ai_chat_controller_1 = require("./ai-chat.controller");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ai_settings_entity_1.AiSettings, mosque_entity_1.Mosque])],
        providers: [ai_settings_service_1.AiSettingsService, ai_chat_service_1.AiChatService, ai_context_service_1.AiContextService],
        controllers: [ai_settings_admin_controller_1.AiSettingsAdminController, ai_chat_controller_1.AiChatController],
        exports: [ai_settings_service_1.AiSettingsService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map