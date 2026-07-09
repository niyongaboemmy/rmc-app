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
exports.MarriageStatusHistory = void 0;
const typeorm_1 = require("typeorm");
const marriage_application_entity_1 = require("./marriage-application.entity");
let MarriageStatusHistory = class MarriageStatusHistory {
};
exports.MarriageStatusHistory = MarriageStatusHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MarriageStatusHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'application_id', type: 'uuid' }),
    __metadata("design:type", String)
], MarriageStatusHistory.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => marriage_application_entity_1.MarriageApplication, (app) => app.statusHistory, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'application_id' }),
    __metadata("design:type", marriage_application_entity_1.MarriageApplication)
], MarriageStatusHistory.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MarriageStatusHistory.prototype, "fromStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_status', type: 'varchar', length: 30 }),
    __metadata("design:type", String)
], MarriageStatusHistory.prototype, "toStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'changed_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageStatusHistory.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageStatusHistory.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'changed_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriageStatusHistory.prototype, "changedAt", void 0);
exports.MarriageStatusHistory = MarriageStatusHistory = __decorate([
    (0, typeorm_1.Entity)('marriage_status_history')
], MarriageStatusHistory);
//# sourceMappingURL=marriage-status-history.entity.js.map