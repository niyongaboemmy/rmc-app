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
exports.MarriageApplication = exports.VenueType = exports.PaymentStatus = exports.MarriageApplicationStatus = void 0;
const typeorm_1 = require("typeorm");
const marriage_document_entity_1 = require("./marriage-document.entity");
const marriage_status_history_entity_1 = require("./marriage-status-history.entity");
const marriage_transaction_entity_1 = require("./marriage-transaction.entity");
var MarriageApplicationStatus;
(function (MarriageApplicationStatus) {
    MarriageApplicationStatus["DRAFT"] = "draft";
    MarriageApplicationStatus["SUBMITTED"] = "submitted";
    MarriageApplicationStatus["UNDER_REVIEW"] = "under_review";
    MarriageApplicationStatus["AMENDMENTS_REQUESTED"] = "amendments_requested";
    MarriageApplicationStatus["APPROVED"] = "approved";
    MarriageApplicationStatus["COMPLETED"] = "completed";
    MarriageApplicationStatus["REJECTED"] = "rejected";
    MarriageApplicationStatus["CANCELLED"] = "cancelled";
    MarriageApplicationStatus["CLOSED"] = "closed";
})(MarriageApplicationStatus || (exports.MarriageApplicationStatus = MarriageApplicationStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "unpaid";
    PaymentStatus["PENDING_CASH"] = "pending_cash";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["FAILED"] = "failed";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var VenueType;
(function (VenueType) {
    VenueType["MOSQUE"] = "mosque";
    VenueType["OUTSIDE"] = "outside";
})(VenueType || (exports.VenueType = VenueType = {}));
let MarriageApplication = class MarriageApplication {
};
exports.MarriageApplication = MarriageApplication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MarriageApplication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_number'),
    (0, typeorm_1.Column)({ name: 'application_number', type: 'varchar', length: 30, unique: true }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "applicationNumber", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_applicant'),
    (0, typeorm_1.Column)({ name: 'applicant_id', type: 'uuid' }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "applicantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notification_phone', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "notificationPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groom_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "groomUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groom_name', type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "groomName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groom_father_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "groomFatherName", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_groom_nid'),
    (0, typeorm_1.Column)({ name: 'groom_nid', type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "groomNid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groom_birth_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "groomBirthDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'groom_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "groomPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bride_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "brideUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bride_name', type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "brideName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bride_father_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "brideFatherName", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_bride_nid'),
    (0, typeorm_1.Column)({ name: 'bride_nid', type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "brideNid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bride_birth_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "brideBirthDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bride_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "bridePhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wali_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "waliName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wali_nid', type: 'varchar', length: 16, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "waliNid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wali_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "waliPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mahr_amount', type: 'decimal', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "mahrAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mahr_currency', type: 'varchar', length: 10, default: 'RWF' }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "mahrCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mahr_description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "mahrDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'witness1_nid', type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "witness1Nid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'witness1_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "witness1Name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'witness2_nid', type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "witness2Nid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'witness2_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "witness2Name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_officiant', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "requestedOfficiant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_imam_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "assignedImamId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'venue_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "venueType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mosque_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "mosqueId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'venue_address', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "venueAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'preferred_date_from', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "preferredDateFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'preferred_date_to', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "preferredDateTo", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_ceremony_date'),
    (0, typeorm_1.Column)({ name: 'ceremony_date', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "ceremonyDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ceremony_scheduled_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "ceremonyScheduledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ceremony_scheduled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "ceremonyScheduledAt", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_status'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: MarriageApplicationStatus.DRAFT }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_marriage_app_payment_status'),
    (0, typeorm_1.Column)({ name: 'payment_status', type: 'varchar', length: 20, default: PaymentStatus.UNPAID }),
    __metadata("design:type", String)
], MarriageApplication.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MarriageApplication.prototype, "amountDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MarriageApplication.prototype, "amountPaid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'review_notes', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "reviewNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amendments_requested_text', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "amendmentsRequestedText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificate_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "certificateUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificate_qr_code', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "certificateQrCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificate_issued_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "certificateIssuedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificate_issued_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "certificateIssuedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wedding_photo_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "weddingPhotoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submitted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriageApplication.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriageApplication.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageApplication.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => marriage_document_entity_1.MarriageDocument, (doc) => doc.application, { cascade: true }),
    __metadata("design:type", Array)
], MarriageApplication.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => marriage_status_history_entity_1.MarriageStatusHistory, (h) => h.application, { cascade: true }),
    __metadata("design:type", Array)
], MarriageApplication.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => marriage_transaction_entity_1.MarriageTransaction, (tx) => tx.application, { cascade: true }),
    __metadata("design:type", Array)
], MarriageApplication.prototype, "transactions", void 0);
exports.MarriageApplication = MarriageApplication = __decorate([
    (0, typeorm_1.Entity)('marriage_applications')
], MarriageApplication);
//# sourceMappingURL=marriage-application.entity.js.map