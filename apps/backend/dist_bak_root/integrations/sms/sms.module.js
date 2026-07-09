"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sms_config_entity_1 = require("./entities/sms-config.entity");
const sms_message_entity_1 = require("./entities/sms-message.entity");
const sms_config_service_1 = require("./sms-config.service");
const sms_service_1 = require("./sms.service");
const sms_config_admin_controller_1 = require("./sms-config-admin.controller");
let SmsModule = class SmsModule {
};
exports.SmsModule = SmsModule;
exports.SmsModule = SmsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([sms_config_entity_1.SmsConfig, sms_message_entity_1.SmsMessage])],
        providers: [sms_config_service_1.SmsConfigService, sms_service_1.SmsService],
        controllers: [sms_config_admin_controller_1.SmsConfigAdminController],
        exports: [sms_service_1.SmsService],
    })
], SmsModule);
//# sourceMappingURL=sms.module.js.map