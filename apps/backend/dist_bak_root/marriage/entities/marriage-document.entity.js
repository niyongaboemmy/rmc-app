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
exports.MarriageDocument = exports.DocumentType = void 0;
const typeorm_1 = require("typeorm");
const marriage_application_entity_1 = require("./marriage-application.entity");
var DocumentType;
(function (DocumentType) {
    DocumentType["GROOM_ID"] = "groom_id";
    DocumentType["BRIDE_ID"] = "bride_id";
    DocumentType["GROOM_PHOTO"] = "groom_photo";
    DocumentType["BRIDE_PHOTO"] = "bride_photo";
    DocumentType["WALI_CONSENT"] = "wali_consent";
    DocumentType["MAHR_AGREEMENT"] = "mahr_agreement";
    DocumentType["PORTRAIT"] = "portrait";
    DocumentType["ADDITIONAL"] = "additional";
    DocumentType["SIGNED_PROVISIONAL"] = "signed_provisional";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
let MarriageDocument = class MarriageDocument {
};
exports.MarriageDocument = MarriageDocument;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MarriageDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'application_id', type: 'uuid' }),
    __metadata("design:type", String)
], MarriageDocument.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => marriage_application_entity_1.MarriageApplication, (app) => app.documents, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'application_id' }),
    __metadata("design:type", marriage_application_entity_1.MarriageApplication)
], MarriageDocument.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_type', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], MarriageDocument.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_key', type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], MarriageDocument.prototype, "fileKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], MarriageDocument.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size', type: 'integer' }),
    __metadata("design:type", Number)
], MarriageDocument.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], MarriageDocument.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageDocument.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MarriageDocument.prototype, "verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageDocument.prototype, "verifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageDocument.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'uploaded_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriageDocument.prototype, "uploadedAt", void 0);
exports.MarriageDocument = MarriageDocument = __decorate([
    (0, typeorm_1.Entity)('marriage_documents')
], MarriageDocument);
//# sourceMappingURL=marriage-document.entity.js.map