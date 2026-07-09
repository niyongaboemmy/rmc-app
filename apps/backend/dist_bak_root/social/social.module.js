"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const content_module_1 = require("../content/content.module");
const social_service_1 = require("./social.service");
const social_controller_1 = require("./social.controller");
const youtube_provider_1 = require("./providers/youtube.provider");
const facebook_provider_1 = require("./providers/facebook.provider");
const instagram_provider_1 = require("./providers/instagram.provider");
const twitter_provider_1 = require("./providers/twitter.provider");
let SocialModule = class SocialModule {
};
exports.SocialModule = SocialModule;
exports.SocialModule = SocialModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, content_module_1.ContentModule],
        providers: [
            social_service_1.SocialService,
            youtube_provider_1.YoutubeProvider,
            facebook_provider_1.FacebookProvider,
            instagram_provider_1.InstagramProvider,
            twitter_provider_1.TwitterProvider,
        ],
        controllers: [social_controller_1.SocialController],
        exports: [social_service_1.SocialService],
    })
], SocialModule);
//# sourceMappingURL=social.module.js.map