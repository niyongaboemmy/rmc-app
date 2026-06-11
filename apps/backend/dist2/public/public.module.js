"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const verse_of_day_entity_1 = require("./entities/verse-of-day.entity");
const announcement_entity_1 = require("./entities/announcement.entity");
const blog_post_entity_1 = require("./entities/blog-post.entity");
const gallery_item_entity_1 = require("./entities/gallery-item.entity");
const public_service_1 = require("./public.service");
const public_controller_1 = require("./public.controller");
let PublicModule = class PublicModule {
};
exports.PublicModule = PublicModule;
exports.PublicModule = PublicModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([verse_of_day_entity_1.VerseOfDay, announcement_entity_1.Announcement, blog_post_entity_1.BlogPost, blog_post_entity_1.BlogCategory, gallery_item_entity_1.GalleryItem])],
        providers: [public_service_1.PublicService],
        controllers: [public_controller_1.PublicController],
        exports: [public_service_1.PublicService],
    })
], PublicModule);
//# sourceMappingURL=public.module.js.map