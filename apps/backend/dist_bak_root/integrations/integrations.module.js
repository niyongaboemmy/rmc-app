"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsModule = void 0;
const common_1 = require("@nestjs/common");
const email_module_1 = require("./email/email.module");
const sms_module_1 = require("./sms/sms.module");
const calendar_module_1 = require("./calendar/calendar.module");
const notification_settings_module_1 = require("./notifications/notification-settings.module");
const ai_module_1 = require("./ai/ai.module");
let IntegrationsModule = class IntegrationsModule {
};
exports.IntegrationsModule = IntegrationsModule;
exports.IntegrationsModule = IntegrationsModule = __decorate([
    (0, common_1.Module)({
        imports: [email_module_1.EmailModule, sms_module_1.SmsModule, calendar_module_1.CalendarModule, notification_settings_module_1.NotificationSettingsModule, ai_module_1.AiModule],
        exports: [email_module_1.EmailModule, sms_module_1.SmsModule, calendar_module_1.CalendarModule, notification_settings_module_1.NotificationSettingsModule, ai_module_1.AiModule],
    })
], IntegrationsModule);
//# sourceMappingURL=integrations.module.js.map