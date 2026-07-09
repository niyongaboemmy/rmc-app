"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
const jwt_config_1 = require("./config/jwt.config");
const redis_config_1 = require("./config/redis.config");
const social_config_1 = require("./config/social.config");
const database_module_1 = require("./database/database.module");
const redis_module_1 = require("./redis/redis.module");
const app_controller_1 = require("./app.controller");
const health_controller_1 = require("./health/health.controller");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const locations_module_1 = require("./locations/locations.module");
const mosques_module_1 = require("./mosques/mosques.module");
const prayer_times_module_1 = require("./prayer-times/prayer-times.module");
const members_module_1 = require("./members/members.module");
const public_module_1 = require("./public/public.module");
const marriage_module_1 = require("./marriage/marriage.module");
const content_module_1 = require("./content/content.module");
const donations_module_1 = require("./donations/donations.module");
const subscribers_module_1 = require("./subscribers/subscribers.module");
const schools_module_1 = require("./schools/schools.module");
const social_module_1 = require("./social/social.module");
const contact_messages_module_1 = require("./contact-messages/contact-messages.module");
const integrations_module_1 = require("./integrations/integrations.module");
const payment_settings_module_1 = require("./payment-settings/payment-settings.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const drive_module_1 = require("./drive/drive.module");
const upload_settings_module_1 = require("./upload-settings/upload-settings.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, jwt_config_1.default, redis_config_1.default, social_config_1.default],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (_config) => [
                    {
                        ttl: 60000,
                        limit: 100,
                    },
                ],
            }),
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            auth_module_1.AuthModule,
            locations_module_1.LocationsModule,
            mosques_module_1.MosquesModule,
            prayer_times_module_1.PrayerTimesModule,
            members_module_1.MembersModule,
            public_module_1.PublicModule,
            marriage_module_1.MarriageModule,
            content_module_1.ContentModule,
            donations_module_1.DonationsModule,
            subscribers_module_1.SubscribersModule,
            schools_module_1.SchoolsModule,
            social_module_1.SocialModule,
            contact_messages_module_1.ContactMessagesModule,
            integrations_module_1.IntegrationsModule,
            payment_settings_module_1.PaymentSettingsModule,
            webhooks_module_1.WebhooksModule,
            drive_module_1.DriveModule,
            upload_settings_module_1.UploadSettingsModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map