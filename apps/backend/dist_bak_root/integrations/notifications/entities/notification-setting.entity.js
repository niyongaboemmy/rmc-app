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
exports.NotificationSetting = void 0;
const typeorm_1 = require("typeorm");
let NotificationSetting = class NotificationSetting {
};
exports.NotificationSetting = NotificationSetting;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NotificationSetting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ name: 'event_key', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], NotificationSetting.prototype, "eventKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], NotificationSetting.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NotificationSetting.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'group_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], NotificationSetting.prototype, "groupName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_applicable', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], NotificationSetting.prototype, "emailApplicable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sms_applicable', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], NotificationSetting.prototype, "smsApplicable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NotificationSetting.prototype, "emailEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sms_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NotificationSetting.prototype, "smsEnabled", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NotificationSetting.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NotificationSetting.prototype, "updatedAt", void 0);
exports.NotificationSetting = NotificationSetting = __decorate([
    (0, typeorm_1.Entity)('notification_settings')
], NotificationSetting);
//# sourceMappingURL=notification-setting.entity.js.map