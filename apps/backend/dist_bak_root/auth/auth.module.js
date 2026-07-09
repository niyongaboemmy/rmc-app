"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const phone_otp_verification_entity_1 = require("./entities/phone-otp-verification.entity");
const member_profile_entity_1 = require("../members/entities/member-profile.entity");
const audit_log_entity_1 = require("../finance/entities/audit-log.entity");
const role_entity_1 = require("../roles/entities/role.entity");
const users_module_1 = require("../users/users.module");
const notification_settings_module_1 = require("../integrations/notifications/notification-settings.module");
const sms_module_1 = require("../integrations/sms/sms.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule,
            users_module_1.UsersModule,
            notification_settings_module_1.NotificationSettingsModule,
            sms_module_1.SmsModule,
            typeorm_1.TypeOrmModule.forFeature([
                refresh_token_entity_1.RefreshToken,
                password_reset_token_entity_1.PasswordResetToken,
                phone_otp_verification_entity_1.PhoneOtpVerification,
                member_profile_entity_1.MemberProfile,
                audit_log_entity_1.AuditLog,
                role_entity_1.Role,
            ]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('jwt.accessSecret'),
                    signOptions: { expiresIn: config.get('jwt.accessExpiry', '15m') },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map