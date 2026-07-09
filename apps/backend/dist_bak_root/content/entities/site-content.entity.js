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
exports.SiteContent = void 0;
const typeorm_1 = require("typeorm");
let SiteContent = class SiteContent {
};
exports.SiteContent = SiteContent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SiteContent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_site_content_section_key', { unique: true }),
    (0, typeorm_1.Column)({ name: 'section_key', type: 'varchar', length: 64, unique: true }),
    __metadata("design:type", String)
], SiteContent.prototype, "sectionKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: () => "'{}'::jsonb" }),
    __metadata("design:type", Object)
], SiteContent.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], SiteContent.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SiteContent.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SiteContent.prototype, "updatedAt", void 0);
exports.SiteContent = SiteContent = __decorate([
    (0, typeorm_1.Entity)('site_content')
], SiteContent);
//# sourceMappingURL=site-content.entity.js.map