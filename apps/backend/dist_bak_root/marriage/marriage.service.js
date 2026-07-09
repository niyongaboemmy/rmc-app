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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MarriageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const marriage_application_entity_1 = require("./entities/marriage-application.entity");
const marriage_document_entity_1 = require("./entities/marriage-document.entity");
const district_codes_1 = require("./district-codes");
const marriage_status_history_entity_1 = require("./entities/marriage-status-history.entity");
const marriage_transaction_entity_1 = require("./entities/marriage-transaction.entity");
const marriage_party_confirmation_entity_1 = require("./entities/marriage-party-confirmation.entity");
const user_entity_1 = require("../users/entities/user.entity");
const crypto = require("crypto");
const notification_settings_service_1 = require("../integrations/notifications/notification-settings.service");
const sms_service_1 = require("../integrations/sms/sms.service");
const sms_templates_1 = require("./sms-templates");
const payment_settings_service_1 = require("../payment-settings/payment-settings.service");
const payment_method_entity_1 = require("../payment-settings/entities/payment-method.entity");
const payment_type_entity_1 = require("../payment-settings/entities/payment-type.entity");
const intouch_pay_service_1 = require("../integrations/intouch-pay/intouch-pay.service");
const MOSQUE_FEE_FALLBACK = 30000;
const OUTSIDE_FEE_FALLBACK = 200000;
const MOSQUE_RATE_CODE = 'MOSQUE';
const OUTSIDE_MOSQUE_CODE = 'OUTSIDE_MOSQUE';
let MarriageService = MarriageService_1 = class MarriageService {
    constructor(applicationRepo, documentRepo, statusHistoryRepo, transactionRepo, userRepo, confirmationRepo, dataSource, configService, notifSettings, smsService, paymentSettings, intouchPay) {
        this.applicationRepo = applicationRepo;
        this.documentRepo = documentRepo;
        this.statusHistoryRepo = statusHistoryRepo;
        this.transactionRepo = transactionRepo;
        this.userRepo = userRepo;
        this.confirmationRepo = confirmationRepo;
        this.dataSource = dataSource;
        this.configService = configService;
        this.notifSettings = notifSettings;
        this.smsService = smsService;
        this.paymentSettings = paymentSettings;
        this.intouchPay = intouchPay;
        this.logger = new common_1.Logger(MarriageService_1.name);
    }
    async getMarriageFees() {
        const rates = await this.paymentSettings.getActiveRates(payment_type_entity_1.PaymentTypeKey.MARRIAGE_FEE);
        const mosqueRate = rates.find((r) => r.code === MOSQUE_RATE_CODE);
        const outsideRate = rates.find((r) => r.code === OUTSIDE_MOSQUE_CODE);
        return {
            mosque: {
                amount: mosqueRate ? Number(mosqueRate.amount) : MOSQUE_FEE_FALLBACK,
                label: mosqueRate?.name ?? 'Mosque Ceremony',
                description: mosqueRate?.description ?? 'Nikah ceremony inside the mosque',
            },
            outside: {
                amount: outsideRate ? Number(outsideRate.amount) : OUTSIDE_FEE_FALLBACK,
                label: outsideRate?.name ?? 'Outside Mosque',
                description: outsideRate?.description ?? 'Nikah ceremony outside mosque premises',
            },
        };
    }
    async resolveMarriageFee(venueType) {
        const rateCode = venueType === marriage_application_entity_1.VenueType.MOSQUE ? MOSQUE_RATE_CODE : OUTSIDE_MOSQUE_CODE;
        try {
            const rate = await this.paymentSettings.getRateByCode(payment_type_entity_1.PaymentTypeKey.MARRIAGE_FEE, rateCode);
            if (rate)
                return Number(rate.amount);
        }
        catch {
        }
        return venueType === marriage_application_entity_1.VenueType.MOSQUE ? MOSQUE_FEE_FALLBACK : OUTSIDE_FEE_FALLBACK;
    }
    async generateApplicationNumber(district) {
        const result = await this.dataSource.query(`SELECT nextval('marriage_application_seq') AS seq`);
        const seq = String(result[0].seq).padStart(5, '0');
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const code = (0, district_codes_1.districtCode)(district) ?? 'MR';
        return `RMC-${code}-${year}${month}-${seq}`;
    }
    async createDraft(applicantId, dto) {
        if (dto.groomNid === dto.brideNid) {
            throw new common_1.BadRequestException('Groom and bride cannot have the same National ID');
        }
        if (dto.witness1Nid === dto.witness2Nid) {
            throw new common_1.BadRequestException('Witnesses cannot have the same National ID');
        }
        if ([dto.witness1Nid, dto.witness2Nid].includes(dto.groomNid)) {
            throw new common_1.BadRequestException('A witness cannot be the same person as the groom');
        }
        if ([dto.witness1Nid, dto.witness2Nid].includes(dto.brideNid)) {
            throw new common_1.BadRequestException('A witness cannot be the same person as the bride');
        }
        const existing = await this.applicationRepo.findOne({
            where: [
                {
                    groomNid: dto.groomNid,
                    status: (0, typeorm_2.In)([
                        marriage_application_entity_1.MarriageApplicationStatus.DRAFT,
                        marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED,
                        marriage_application_entity_1.MarriageApplicationStatus.UNDER_REVIEW,
                        marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED,
                        marriage_application_entity_1.MarriageApplicationStatus.APPROVED,
                    ]),
                },
                {
                    brideNid: dto.brideNid,
                    status: (0, typeorm_2.In)([
                        marriage_application_entity_1.MarriageApplicationStatus.DRAFT,
                        marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED,
                        marriage_application_entity_1.MarriageApplicationStatus.UNDER_REVIEW,
                        marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED,
                        marriage_application_entity_1.MarriageApplicationStatus.APPROVED,
                    ]),
                },
            ],
        });
        if (existing) {
            throw new common_1.ConflictException(`An active application already exists for one of the partners (${existing.applicationNumber})`);
        }
        const amountDue = await this.resolveMarriageFee(dto.venueType);
        const applicationNumber = await this.generateApplicationNumber(dto.district);
        const app = this.applicationRepo.create({
            applicationNumber,
            applicantId,
            notificationPhone: dto.notificationPhone,
            groomName: dto.groomName,
            groomFatherName: dto.groomFatherName ?? null,
            groomNid: dto.groomNid,
            groomBirthDate: dto.groomBirthDate ? new Date(dto.groomBirthDate) : null,
            groomPhone: dto.groomPhone,
            brideName: dto.brideName,
            brideFatherName: dto.brideFatherName ?? null,
            brideNid: dto.brideNid,
            brideBirthDate: dto.brideBirthDate ? new Date(dto.brideBirthDate) : null,
            bridePhone: dto.bridePhone,
            witness1Nid: dto.witness1Nid,
            witness1Name: dto.witness1Name,
            witness2Nid: dto.witness2Nid,
            witness2Name: dto.witness2Name,
            waliName: dto.waliName ?? null,
            waliNid: dto.waliNid ?? null,
            waliPhone: dto.waliPhone ?? null,
            mahrAmount: dto.mahrAmount ?? null,
            mahrDescription: dto.mahrDescription ?? null,
            requestedOfficiant: dto.requestedOfficiant ?? null,
            venueType: dto.venueType,
            province: dto.province,
            district: dto.district,
            mosqueId: dto.mosqueId ?? null,
            venueAddress: dto.venueAddress ?? null,
            preferredDateFrom: new Date(dto.preferredDateFrom),
            preferredDateTo: dto.preferredDateTo ? new Date(dto.preferredDateTo) : null,
            paymentMethod: dto.paymentMethod,
            amountDue,
            status: marriage_application_entity_1.MarriageApplicationStatus.DRAFT,
            paymentStatus: marriage_application_entity_1.PaymentStatus.UNPAID,
        });
        const saved = await this.applicationRepo.save(app);
        await this.recordStatusChange(saved.id, null, marriage_application_entity_1.MarriageApplicationStatus.DRAFT, applicantId, 'Application draft created');
        return saved;
    }
    async updateDraft(id, applicantId, dto) {
        const app = await this.findOwnApplication(id, applicantId);
        if (![marriage_application_entity_1.MarriageApplicationStatus.DRAFT, marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED].includes(app.status)) {
            throw new common_1.ForbiddenException('Only draft or amendments-requested applications can be updated');
        }
        Object.assign(app, {
            notificationPhone: dto.notificationPhone ?? app.notificationPhone,
            groomName: dto.groomName ?? app.groomName,
            groomFatherName: dto.groomFatherName ?? app.groomFatherName,
            groomNid: dto.groomNid ?? app.groomNid,
            groomBirthDate: dto.groomBirthDate ? new Date(dto.groomBirthDate) : app.groomBirthDate,
            groomPhone: dto.groomPhone ?? app.groomPhone,
            brideName: dto.brideName ?? app.brideName,
            brideFatherName: dto.brideFatherName ?? app.brideFatherName,
            brideNid: dto.brideNid ?? app.brideNid,
            brideBirthDate: dto.brideBirthDate ? new Date(dto.brideBirthDate) : app.brideBirthDate,
            bridePhone: dto.bridePhone ?? app.bridePhone,
            witness1Nid: dto.witness1Nid ?? app.witness1Nid,
            witness1Name: dto.witness1Name ?? app.witness1Name,
            witness2Nid: dto.witness2Nid ?? app.witness2Nid,
            witness2Name: dto.witness2Name ?? app.witness2Name,
            waliName: dto.waliName ?? app.waliName,
            waliNid: dto.waliNid ?? app.waliNid,
            waliPhone: dto.waliPhone ?? app.waliPhone,
            mahrAmount: dto.mahrAmount ?? app.mahrAmount,
            mahrDescription: dto.mahrDescription ?? app.mahrDescription,
            requestedOfficiant: dto.requestedOfficiant ?? app.requestedOfficiant,
            venueType: dto.venueType ?? app.venueType,
            province: dto.province ?? app.province,
            district: dto.district ?? app.district,
            mosqueId: dto.mosqueId ?? app.mosqueId,
            venueAddress: dto.venueAddress ?? app.venueAddress,
            preferredDateFrom: dto.preferredDateFrom
                ? new Date(dto.preferredDateFrom)
                : app.preferredDateFrom,
            preferredDateTo: dto.preferredDateTo ? new Date(dto.preferredDateTo) : app.preferredDateTo,
            paymentMethod: dto.paymentMethod ?? app.paymentMethod,
            amountDue: dto.venueType ? await this.resolveMarriageFee(dto.venueType) : app.amountDue,
        });
        return this.applicationRepo.save(app);
    }
    async submit(id, applicantId) {
        const app = await this.findOwnApplication(id, applicantId);
        if (app.status !== marriage_application_entity_1.MarriageApplicationStatus.DRAFT &&
            app.status !== marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED) {
            throw new common_1.BadRequestException('Only draft or amendments-requested applications can be submitted');
        }
        if (app.paymentMethod === 'momo' && app.paymentStatus !== marriage_application_entity_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Mobile Money payment must be completed before submitting the application.');
        }
        const prevStatus = app.status;
        app.status = marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED;
        app.submittedAt = new Date();
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.UNPAID) {
            app.paymentStatus = marriage_application_entity_1.PaymentStatus.PENDING_CASH;
        }
        const saved = await this.applicationRepo.save(app);
        await this.recordStatusChange(saved.id, prevStatus, marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED, applicantId, 'Application submitted');
        await this.sendSubmissionSms(saved);
        return saved;
    }
    async initiateUserMomoPayment(id, applicantId, mobilePhone) {
        const app = await this.findOwnApplication(id, applicantId);
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Payment has already been completed for this application');
        }
        if (app.status !== marriage_application_entity_1.MarriageApplicationStatus.DRAFT &&
            app.status !== marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED) {
            throw new common_1.BadRequestException('Application must be in draft status to initiate payment');
        }
        const creds = await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('MoMo (IntouchPay) credentials are not configured');
        }
        const requestTxnId = `MAR-${app.applicationNumber}-${Date.now()}`;
        const fallbackCallback = `${this.configService.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;
        const result = await this.intouchPay.requestPayment({
            username: creds.username,
            partnerPassword: creds.partnerPassword,
            accountNo: creds.accountNo,
            amount: Number(app.amountDue),
            mobilePhone,
            transactionId: requestTxnId,
            callbackUrl: creds.callbackUrl || fallbackCallback,
            gatewayUrl: creds.gatewayUrl || undefined,
        });
        app.paymentStatus = marriage_application_entity_1.PaymentStatus.PROCESSING;
        app.paymentMethod = 'momo';
        await this.applicationRepo.save(app);
        const tx = this.transactionRepo.create({
            applicationId: app.id,
            method: 'momo',
            providerRef: requestTxnId,
            amount: app.amountDue,
            status: result.status === 'SUCCESSFUL'
                ? 'completed'
                : result.status === 'FAILED'
                    ? 'failed'
                    : 'pending',
            metadata: {
                gatewayTransactionId: result.transactionId,
                responseCode: result.responseCode,
                mobilePhone,
            },
        });
        const savedTx = await this.transactionRepo.save(tx);
        if (result.status === 'SUCCESSFUL') {
            app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
            app.amountPaid = app.amountDue;
            savedTx.completedAt = new Date();
            await this.applicationRepo.save(app);
            await this.transactionRepo.save(savedTx);
            await this.sendPaymentConfirmedSms(app);
        }
        return {
            application: app,
            transaction: savedTx,
            gatewayRef: result.transactionId ?? null,
            responseCode: result.responseCode,
            message: result.message,
        };
    }
    async devCompletePayment(id, applicantId) {
        const bypassEnabled = process.env.NODE_ENV !== 'production' &&
            process.env.ENABLE_DEV_PAYMENT_BYPASS === 'true';
        if (!bypassEnabled) {
            throw new common_1.ForbiddenException('Development payment bypass is disabled. To enable it locally, set NODE_ENV=development and ENABLE_DEV_PAYMENT_BYPASS=true.');
        }
        const app = await this.findOwnApplication(id, applicantId);
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.PAID)
            return app;
        if (app.status !== marriage_application_entity_1.MarriageApplicationStatus.DRAFT &&
            app.status !== marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED) {
            throw new common_1.BadRequestException('Application must be in draft status to complete payment');
        }
        if (!app.amountDue || Number(app.amountDue) <= 0) {
            app.amountDue = await this.resolveMarriageFee(app.venueType);
        }
        app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
        app.amountPaid = app.amountDue;
        app.paymentMethod = 'momo';
        const saved = await this.applicationRepo.save(app);
        const tx = this.transactionRepo.create({
            applicationId: app.id,
            method: 'momo',
            providerRef: `DEV-${app.applicationNumber}-${Date.now()}`,
            amount: app.amountDue,
            status: 'completed',
            completedAt: new Date(),
            metadata: { dev: true, responseCode: 'DEV', note: 'Simulated payment (development mode)' },
        });
        await this.transactionRepo.save(tx);
        return saved;
    }
    async cancel(id, applicantId) {
        const app = await this.findOwnApplication(id, applicantId);
        if ([
            marriage_application_entity_1.MarriageApplicationStatus.APPROVED,
            marriage_application_entity_1.MarriageApplicationStatus.COMPLETED,
            marriage_application_entity_1.MarriageApplicationStatus.CLOSED,
        ].includes(app.status)) {
            throw new common_1.ForbiddenException('Cannot cancel an approved or completed application');
        }
        const prev = app.status;
        app.status = marriage_application_entity_1.MarriageApplicationStatus.CANCELLED;
        const saved = await this.applicationRepo.save(app);
        await this.recordStatusChange(saved.id, prev, marriage_application_entity_1.MarriageApplicationStatus.CANCELLED, applicantId, 'Cancelled by applicant');
        return saved;
    }
    async saveDocument(id, applicantId, dto) {
        await this.findOwnApplication(id, applicantId);
        const existing = await this.documentRepo.findOne({
            where: { applicationId: id, documentType: dto.documentType },
        });
        if (existing) {
            await this.documentRepo.remove(existing);
        }
        const doc = this.documentRepo.create({
            applicationId: id,
            documentType: dto.documentType,
            fileKey: dto.fileKey,
            fileName: dto.fileName,
            fileSize: dto.fileSize,
            mimeType: dto.mimeType,
            uploadedBy: applicantId,
        });
        return this.documentRepo.save(doc);
    }
    async findOwnApplication(id, applicantId) {
        const app = await this.applicationRepo.findOne({
            where: { id },
            relations: ['documents', 'statusHistory', 'transactions'],
        });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        if (app.applicantId !== applicantId)
            throw new common_1.ForbiddenException('Access denied');
        return app;
    }
    async findByApplicationNumber(applicationNumber) {
        return this.applicationRepo.findOne({
            where: { applicationNumber: applicationNumber.toUpperCase() },
            relations: ['documents', 'statusHistory'],
        });
    }
    async findAllByApplicant(applicantId) {
        return this.applicationRepo.find({
            where: { applicantId },
            order: { createdAt: 'DESC' },
        });
    }
    async adminFindAll(filters) {
        const { status, paymentStatus, venueType, search, dateFrom, dateTo, sort, order, page = 1, limit = 20, } = filters;
        const SORT_COLUMNS = {
            date: 'app.createdAt',
            amount: 'app.amountPaid',
            couple: 'app.groomName',
            payment: 'app.paymentStatus',
            status: 'app.status',
        };
        const sortCol = SORT_COLUMNS[sort ?? 'date'] ?? SORT_COLUMNS.date;
        const dir = (order ?? '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const qb = this.applicationRepo
            .createQueryBuilder('app')
            .leftJoinAndSelect('app.documents', 'docs')
            .orderBy(sortCol, dir)
            .addOrderBy('app.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (status)
            qb.andWhere('app.status = :status', { status });
        if (paymentStatus)
            qb.andWhere('app.paymentStatus = :paymentStatus', { paymentStatus });
        if (venueType)
            qb.andWhere('app.venueType = :venueType', { venueType });
        if (dateFrom)
            qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
        if (dateTo) {
            const end = new Date(dateTo);
            end.setDate(end.getDate() + 1);
            qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
        }
        if (search) {
            qb.andWhere('(app.groomName ILIKE :q OR app.brideName ILIKE :q OR app.applicationNumber ILIKE :q)', { q: `%${search}%` });
        }
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async adminFindOne(id) {
        const app = await this.applicationRepo.findOne({
            where: { id },
            relations: ['documents', 'statusHistory', 'transactions'],
        });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        const applicant = app.applicantId
            ? await this.userRepo.findOne({ where: { id: app.applicantId } })
            : null;
        if (applicant) {
            app.applicant = {
                id: applicant.id,
                name: [applicant.firstName, applicant.lastName].filter(Boolean).join(' '),
                email: applicant.email,
                phone: applicant.phone,
            };
        }
        return app;
    }
    async adminVerifyDocument(applicationId, documentId, adminId, verified) {
        const doc = await this.documentRepo.findOne({
            where: { id: documentId, applicationId },
        });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        doc.verified = verified;
        doc.verifiedBy = verified ? adminId : null;
        doc.verifiedAt = verified ? new Date() : null;
        await this.documentRepo.save(doc);
        return this.adminFindOne(applicationId);
    }
    async adminUpdateStatus(id, adminId, dto) {
        const app = await this.adminFindOne(id);
        const prev = app.status;
        app.status = dto.status;
        app.reviewedBy = adminId;
        app.reviewedAt = new Date();
        if (dto.notes)
            app.reviewNotes = dto.notes;
        if (dto.rejectionReason)
            app.rejectionReason = dto.rejectionReason;
        if (dto.amendmentsRequestedText)
            app.amendmentsRequestedText = dto.amendmentsRequestedText;
        const saved = await this.applicationRepo.save(app);
        await this.recordStatusChange(saved.id, prev, dto.status, adminId, dto.notes ?? null);
        await this.sendStatusChangeSms(saved, prev);
        return saved;
    }
    async adminScheduleCeremony(id, adminId, dto) {
        const app = await this.adminFindOne(id);
        app.ceremonyDate = new Date(dto.ceremonyDate);
        app.ceremonyScheduledBy = adminId;
        app.ceremonyScheduledAt = new Date();
        if (dto.assignedImamId)
            app.assignedImamId = dto.assignedImamId;
        const saved = await this.applicationRepo.save(app);
        await this.sendCeremonyScheduledSms(saved);
        return saved;
    }
    async adminSaveWeddingPhoto(id, adminId, photoUrl) {
        const app = await this.adminFindOne(id);
        const uploadableStatuses = [
            marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED,
            marriage_application_entity_1.MarriageApplicationStatus.UNDER_REVIEW,
            marriage_application_entity_1.MarriageApplicationStatus.AMENDMENTS_REQUESTED,
            marriage_application_entity_1.MarriageApplicationStatus.APPROVED,
            marriage_application_entity_1.MarriageApplicationStatus.COMPLETED,
        ];
        if (!uploadableStatuses.includes(app.status)) {
            throw new common_1.BadRequestException('Photo can only be uploaded for active applications');
        }
        app.weddingPhotoUrl = photoUrl;
        return this.applicationRepo.save(app);
    }
    async adminSaveSignedProvisional(id, adminId, dto) {
        await this.adminFindOne(id);
        const existing = await this.documentRepo.findOne({
            where: { applicationId: id, documentType: marriage_document_entity_1.DocumentType.SIGNED_PROVISIONAL },
        });
        if (existing)
            await this.documentRepo.remove(existing);
        const doc = this.documentRepo.create({
            applicationId: id,
            documentType: marriage_document_entity_1.DocumentType.SIGNED_PROVISIONAL,
            fileKey: dto.fileKey,
            fileName: dto.fileName,
            fileSize: dto.fileSize,
            mimeType: dto.mimeType,
            uploadedBy: adminId,
        });
        await this.documentRepo.save(doc);
        return this.adminFindOne(id);
    }
    async adminConfirmCashPayment(id, adminId) {
        const app = await this.adminFindOne(id);
        app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
        app.amountPaid = app.amountDue;
        const tx = this.transactionRepo.create({
            applicationId: id,
            method: app.paymentMethod ?? 'cash',
            amount: app.amountDue,
            status: 'completed',
            confirmedBy: adminId,
            completedAt: new Date(),
        });
        await this.transactionRepo.save(tx);
        if (app.status === marriage_application_entity_1.MarriageApplicationStatus.DRAFT) {
            const prev = app.status;
            app.status = marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED;
            app.submittedAt = new Date();
            await this.recordStatusChange(id, prev, marriage_application_entity_1.MarriageApplicationStatus.SUBMITTED, adminId, 'Payment confirmed — application submitted');
        }
        const saved = await this.applicationRepo.save(app);
        await this.sendPaymentConfirmedSms(saved);
        return saved;
    }
    async adminIssueCertificate(id, adminId) {
        const app = await this.adminFindOne(id);
        if (app.status !== marriage_application_entity_1.MarriageApplicationStatus.APPROVED &&
            app.status !== marriage_application_entity_1.MarriageApplicationStatus.COMPLETED) {
            throw new common_1.BadRequestException('Certificate can only be issued for approved applications');
        }
        const hasSignedProvisional = app.documents?.some((d) => d.documentType === marriage_document_entity_1.DocumentType.SIGNED_PROVISIONAL);
        if (!hasSignedProvisional) {
            throw new common_1.BadRequestException('Attach the signed provisional certificate before issuing the certificate');
        }
        const frontendUrl = this.configService.get('app.frontendUrl', 'http://localhost:3001');
        app.certificateUrl = `${frontendUrl}/en/certificates/${app.applicationNumber}`;
        app.certificateQrCode = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;
        app.certificateIssuedAt = new Date();
        app.certificateIssuedBy = adminId;
        const prev = app.status;
        app.status = marriage_application_entity_1.MarriageApplicationStatus.CLOSED;
        const saved = await this.applicationRepo.save(app);
        await this.recordStatusChange(saved.id, prev, marriage_application_entity_1.MarriageApplicationStatus.CLOSED, adminId, 'Certificate issued');
        await this.sendStatusChangeSms(saved, prev);
        return saved;
    }
    async adminInitiateMomoPayment(id, adminId, mobilePhone) {
        const app = await this.adminFindOne(id);
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Payment has already been completed for this application');
        }
        const creds = await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('MoMo (IntouchPay) credentials are not configured');
        }
        const requestTxnId = `MAR-${app.applicationNumber}-${Date.now()}`;
        const callbackUrl = `${this.configService.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;
        const result = await this.intouchPay.requestPayment({
            username: creds.username,
            partnerPassword: creds.partnerPassword,
            accountNo: creds.accountNo,
            amount: Number(app.amountDue),
            mobilePhone,
            transactionId: requestTxnId,
            callbackUrl: creds.callbackUrl || callbackUrl,
            gatewayUrl: creds.gatewayUrl || undefined,
        });
        app.paymentStatus = marriage_application_entity_1.PaymentStatus.PROCESSING;
        app.paymentMethod = 'momo';
        await this.applicationRepo.save(app);
        const tx = this.transactionRepo.create({
            applicationId: app.id,
            method: 'momo',
            providerRef: requestTxnId,
            amount: app.amountDue,
            status: result.status === 'SUCCESSFUL'
                ? 'completed'
                : result.status === 'FAILED'
                    ? 'failed'
                    : 'pending',
            metadata: {
                gatewayTransactionId: result.transactionId,
                responseCode: result.responseCode,
                mobilePhone,
                initiatedBy: adminId,
            },
        });
        const savedTx = await this.transactionRepo.save(tx);
        if (result.status === 'SUCCESSFUL') {
            app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
            app.amountPaid = app.amountDue;
            savedTx.completedAt = new Date();
            await this.applicationRepo.save(app);
            await this.transactionRepo.save(savedTx);
            await this.sendPaymentConfirmedSms(app);
        }
        return { application: app, transaction: savedTx, gatewayResponse: result };
    }
    async checkUserMomoPaymentStatus(id, applicantId) {
        const app = await this.findOwnApplication(id, applicantId);
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.PAID) {
            return { paymentStatus: 'paid', gatewayStatus: 'SUCCESSFUL', responseCode: '01', message: 'Payment already confirmed' };
        }
        if (app.paymentStatus === marriage_application_entity_1.PaymentStatus.FAILED) {
            return { paymentStatus: 'failed', gatewayStatus: 'FAILED', responseCode: '', message: 'Payment failed' };
        }
        const tx = await this.transactionRepo.findOne({
            where: { applicationId: id, method: 'momo', status: 'pending' },
            order: { initiatedAt: 'DESC' },
        });
        if (!tx) {
            return { paymentStatus: app.paymentStatus, gatewayStatus: 'PENDING', responseCode: '1000', message: 'No active MoMo transaction found' };
        }
        const creds = await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            return { paymentStatus: app.paymentStatus, gatewayStatus: 'PENDING', responseCode: '', message: 'Credentials not configured' };
        }
        const statusResult = await this.intouchPay.getTransactionStatus({
            username: creds.username,
            partnerPassword: creds.partnerPassword,
            accountNo: creds.accountNo,
            requestTransactionId: tx.providerRef ?? '',
            transactionId: String(tx.metadata?.gatewayTransactionId ?? ''),
            gatewayBaseUrl: creds.gatewayUrl,
        });
        if (statusResult.status !== 'PENDING') {
            tx.status = statusResult.status === 'SUCCESSFUL' ? 'completed' : 'failed';
            tx.completedAt = new Date();
            await this.transactionRepo.save(tx);
            if (statusResult.status === 'SUCCESSFUL') {
                app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
                app.amountPaid = app.amountDue;
                await this.applicationRepo.save(app);
                await this.sendPaymentConfirmedSms(app);
            }
            else {
                app.paymentStatus = marriage_application_entity_1.PaymentStatus.FAILED;
                await this.applicationRepo.save(app);
            }
        }
        return {
            paymentStatus: app.paymentStatus,
            gatewayStatus: statusResult.status,
            responseCode: statusResult.responseCode,
            message: statusResult.message,
        };
    }
    async adminGetMomoPaymentStatus(id, transactionId) {
        const app = await this.adminFindOne(id);
        const tx = await this.transactionRepo.findOne({
            where: { id: transactionId, applicationId: id },
        });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        const creds = await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
        if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
            throw new common_1.BadRequestException('IntouchPay credentials not configured');
        }
        const statusResult = await this.intouchPay.getTransactionStatus({
            username: creds.username,
            partnerPassword: creds.partnerPassword,
            accountNo: creds.accountNo,
            requestTransactionId: tx.providerRef ?? '',
            transactionId: String(tx.metadata?.gatewayTransactionId ?? ''),
            gatewayBaseUrl: creds.gatewayUrl,
        });
        if (statusResult.status !== 'PENDING' && tx.status === 'pending') {
            tx.status = statusResult.status === 'SUCCESSFUL' ? 'completed' : 'failed';
            tx.completedAt = new Date();
            await this.transactionRepo.save(tx);
            if (statusResult.status === 'SUCCESSFUL' && app.paymentStatus !== marriage_application_entity_1.PaymentStatus.PAID) {
                app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
                app.amountPaid = app.amountDue;
                await this.applicationRepo.save(app);
                await this.sendPaymentConfirmedSms(app);
            }
            else if (statusResult.status === 'FAILED') {
                app.paymentStatus = marriage_application_entity_1.PaymentStatus.FAILED;
                await this.applicationRepo.save(app);
            }
        }
        return {
            status: statusResult.status,
            responseCode: statusResult.responseCode,
            message: statusResult.message,
        };
    }
    async adminGetStats() {
        const total = await this.applicationRepo.count();
        const byStatus = await this.applicationRepo
            .createQueryBuilder('app')
            .select('app.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('app.status')
            .getRawMany();
        const revenue = await this.applicationRepo
            .createQueryBuilder('app')
            .select('SUM(app.amountPaid)', 'total')
            .where('app.paymentStatus = :ps', { ps: marriage_application_entity_1.PaymentStatus.PAID })
            .getRawOne();
        return { total, byStatus, revenue: Number(revenue?.total ?? 0) };
    }
    async publicVerify(applicationNumber) {
        const app = await this.applicationRepo.findOne({
            where: {
                applicationNumber: applicationNumber.toUpperCase(),
                status: marriage_application_entity_1.MarriageApplicationStatus.CLOSED,
            },
        });
        if (!app)
            throw new common_1.NotFoundException('Certificate not found or not yet issued');
        return {
            applicationNumber: app.applicationNumber,
            groomName: app.groomName,
            brideName: app.brideName,
            ceremonyDate: app.ceremonyDate,
            issuedAt: app.certificateIssuedAt,
            status: 'valid',
        };
    }
    async recordStatusChange(applicationId, fromStatus, toStatus, changedBy, notes) {
        const history = this.statusHistoryRepo.create({
            applicationId,
            fromStatus,
            toStatus,
            changedBy,
            notes,
        });
        return this.statusHistoryRepo.save(history);
    }
    async getRecipientPhone(app) {
        if (app.notificationPhone)
            return app.notificationPhone;
        return this.getApplicantPhone(app.applicantId);
    }
    async getApplicantPhone(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        return user?.phone ?? '';
    }
    dispatchSms(to, message) {
        if (!to) {
            this.logger.warn('SMS skipped: no recipient phone number');
            return;
        }
        void this.smsService.sendSms(to, message);
    }
    async sendSubmissionSms(app) {
        if (!this.notifSettings.isSmsEnabled('marriage.submission'))
            return;
        const phone = await this.getRecipientPhone(app);
        this.dispatchSms(phone, sms_templates_1.SmsTemplates.submission(app.applicationNumber, app.groomName, app.brideName));
    }
    async sendStatusChangeSms(app, _previousStatus) {
        if (!this.notifSettings.isSmsEnabled('marriage.status_change'))
            return;
        const phone = await this.getRecipientPhone(app);
        const message = this.buildStatusMessage(app);
        if (!message)
            return;
        this.dispatchSms(phone, message);
    }
    buildStatusMessage(app) {
        switch (app.status) {
            case 'under_review':
                return sms_templates_1.SmsTemplates.underReview(app.applicationNumber);
            case 'approved':
                return sms_templates_1.SmsTemplates.approved(app.applicationNumber);
            case 'rejected':
                return sms_templates_1.SmsTemplates.rejected(app.applicationNumber, app.rejectionReason);
            case 'amendments_requested':
                return sms_templates_1.SmsTemplates.amendmentsRequested(app.applicationNumber, app.amendmentsRequestedText);
            case 'completed':
                return sms_templates_1.SmsTemplates.completed(app.applicationNumber);
            case 'closed':
                return sms_templates_1.SmsTemplates.closed(app.applicationNumber);
            default:
                return null;
        }
    }
    async sendCeremonyScheduledSms(app) {
        if (!this.notifSettings.isSmsEnabled('marriage.ceremony_scheduled'))
            return;
        const phone = await this.getRecipientPhone(app);
        const date = app.ceremonyDate
            ? new Date(app.ceremonyDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })
            : 'TBC';
        this.dispatchSms(phone, sms_templates_1.SmsTemplates.ceremonyScheduled(app.applicationNumber, date));
    }
    async sendPaymentConfirmedSms(app) {
        if (!this.notifSettings.isSmsEnabled('marriage.payment_confirmed'))
            return;
        const phone = await this.getRecipientPhone(app);
        const amount = Number(app.amountPaid || app.amountDue).toLocaleString('en-RW');
        this.dispatchSms(phone, sms_templates_1.SmsTemplates.paymentConfirmed(app.applicationNumber, amount));
    }
    async addParties(applicationId, requesterId, parties) {
        const app = await this.applicationRepo.findOne({ where: { id: applicationId } });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        if (app.applicantId !== requesterId)
            throw new common_1.ForbiddenException('Not your application');
        const frontendUrl = this.configService.get('app.frontendUrl', 'http://localhost:3001');
        const results = [];
        for (const party of parties) {
            const token = crypto.randomBytes(40).toString('hex');
            const entry = this.confirmationRepo.create({
                applicationId,
                role: party.role,
                name: party.name ?? null,
                nid: party.nid ?? null,
                phone: party.phone ?? null,
                confirmationToken: token,
            });
            const saved = await this.confirmationRepo.save(entry);
            results.push(saved);
            if (party.phone && this.notifSettings.isSmsEnabled('marriage.party_confirmation')) {
                const link = `${frontendUrl}/en/services/marriage/confirm/${token}`;
                this.dispatchSms(party.phone, sms_templates_1.SmsTemplates.partyConfirmation(app.applicationNumber, party.role, link));
            }
            else {
                this.logger.log(`[Confirmation token for ${party.role}] ${token}`);
            }
        }
        return results;
    }
    async getPartyConfirmations(applicationId) {
        return this.confirmationRepo.find({
            where: { applicationId },
            order: { role: 'ASC' },
        });
    }
    async lookupByToken(token) {
        const conf = await this.confirmationRepo.findOne({ where: { confirmationToken: token } });
        if (!conf)
            throw new common_1.NotFoundException('Confirmation link not found or already used');
        const app = await this.applicationRepo.findOne({ where: { id: conf.applicationId } });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        return {
            confirmation: conf,
            application: {
                applicationNumber: app.applicationNumber,
                groomName: app.groomName,
                brideName: app.brideName,
                ceremonyDate: app.ceremonyDate,
                status: app.status,
            },
        };
    }
    async confirmParty(token, notes) {
        const conf = await this.confirmationRepo.findOne({ where: { confirmationToken: token } });
        if (!conf)
            throw new common_1.NotFoundException('Confirmation link not found');
        if (conf.confirmedAt)
            throw new common_1.ConflictException('Already confirmed');
        conf.confirmedAt = new Date();
        if (notes)
            conf.notes = notes;
        conf.confirmationToken = null;
        return this.confirmationRepo.save(conf);
    }
};
exports.MarriageService = MarriageService;
exports.MarriageService = MarriageService = MarriageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(marriage_application_entity_1.MarriageApplication)),
    __param(1, (0, typeorm_1.InjectRepository)(marriage_document_entity_1.MarriageDocument)),
    __param(2, (0, typeorm_1.InjectRepository)(marriage_status_history_entity_1.MarriageStatusHistory)),
    __param(3, (0, typeorm_1.InjectRepository)(marriage_transaction_entity_1.MarriageTransaction)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(5, (0, typeorm_1.InjectRepository)(marriage_party_confirmation_entity_1.MarriagePartyConfirmation)),
    __param(6, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        config_1.ConfigService,
        notification_settings_service_1.NotificationSettingsService,
        sms_service_1.SmsService,
        payment_settings_service_1.PaymentSettingsService,
        intouch_pay_service_1.IntouchPayService])
], MarriageService);
//# sourceMappingURL=marriage.service.js.map