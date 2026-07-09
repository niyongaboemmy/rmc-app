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
exports.MarriagePartyConfirmation = exports.PartyRole = void 0;
const typeorm_1 = require("typeorm");
var PartyRole;
(function (PartyRole) {
    PartyRole["BRIDE"] = "bride";
    PartyRole["GROOM"] = "groom";
    PartyRole["WALI"] = "wali";
    PartyRole["IMAM"] = "imam";
})(PartyRole || (exports.PartyRole = PartyRole = {}));
let MarriagePartyConfirmation = class MarriagePartyConfirmation {
};
exports.MarriagePartyConfirmation = MarriagePartyConfirmation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MarriagePartyConfirmation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_mpc_application_id'),
    (0, typeorm_1.Column)({ name: 'application_id', type: 'uuid' }),
    __metadata("design:type", String)
], MarriagePartyConfirmation.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PartyRole }),
    __metadata("design:type", String)
], MarriagePartyConfirmation.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "nid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_mpc_token', { unique: true }),
    (0, typeorm_1.Column)({ name: 'confirmation_token', type: 'varchar', length: 80, unique: true, nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "confirmationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriagePartyConfirmation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriagePartyConfirmation.prototype, "createdAt", void 0);
exports.MarriagePartyConfirmation = MarriagePartyConfirmation = __decorate([
    (0, typeorm_1.Entity)('marriage_party_confirmations')
], MarriagePartyConfirmation);
//# sourceMappingURL=marriage-party-confirmation.entity.js.map