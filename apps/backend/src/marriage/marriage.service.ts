import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  MarriageApplication,
  MarriageApplicationStatus,
  PaymentStatus,
  VenueType,
} from './entities/marriage-application.entity';
import { MarriageDocument, DocumentType } from './entities/marriage-document.entity';
import { districtCode } from '../common/district-codes';
import { generateTrackingCode } from '../tracking/tracking-code.util';
import type { TrackingSubject } from '../tracking/tracking-verification.service';
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import {
  MarriagePartyConfirmation,
  PartyRole,
} from './entities/marriage-party-confirmation.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { SmsTemplates } from './sms-templates';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentTypeKey } from '../payment-settings/entities/payment-type.entity';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';

// Fallback constants — used if DB rates are not yet configured
const MOSQUE_FEE_FALLBACK = 30000;
const OUTSIDE_FEE_FALLBACK = 200000;
const MOSQUE_RATE_CODE = 'MOSQUE';
const OUTSIDE_MOSQUE_CODE = 'OUTSIDE_MOSQUE';

@Injectable()
export class MarriageService {
  private readonly logger = new Logger(MarriageService.name);

  constructor(
    @InjectRepository(MarriageApplication)
    private readonly applicationRepo: Repository<MarriageApplication>,
    @InjectRepository(MarriageDocument)
    private readonly documentRepo: Repository<MarriageDocument>,
    @InjectRepository(MarriageStatusHistory)
    private readonly statusHistoryRepo: Repository<MarriageStatusHistory>,
    @InjectRepository(MarriageTransaction)
    private readonly transactionRepo: Repository<MarriageTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MarriagePartyConfirmation)
    private readonly confirmationRepo: Repository<MarriagePartyConfirmation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly intouchPay: IntouchPayService,
  ) {}

  // ── Marriage Fee Lookup ────────────────────────────────────────────────────

  /** Returns both fee tiers for public display (venue selector and payment step). */
  async getMarriageFees(): Promise<{
    mosque: { amount: number; label: string; description: string };
    outside: { amount: number; label: string; description: string };
  }> {
    const rates = await this.paymentSettings.getActiveRates(PaymentTypeKey.MARRIAGE_FEE);
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

  /** Returns the configured fee for the given venue type, falling back to constants. */
  private async resolveMarriageFee(venueType: VenueType): Promise<number> {
    const rateCode = venueType === VenueType.MOSQUE ? MOSQUE_RATE_CODE : OUTSIDE_MOSQUE_CODE;
    try {
      const rate = await this.paymentSettings.getRateByCode(PaymentTypeKey.MARRIAGE_FEE, rateCode);
      if (rate) return Number(rate.amount);
    } catch {
      // fall through to hardcoded fallback
    }
    return venueType === VenueType.MOSQUE ? MOSQUE_FEE_FALLBACK : OUTSIDE_FEE_FALLBACK;
  }

  // ── Application Number ──────────────────────────────────────────────────────

  private async generateApplicationNumber(district?: string): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('marriage_application_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Use the district code (01–30) in place of the "MR" segment; fall back to
    // "MR" when the district is missing/unrecognised.
    const code = districtCode(district) ?? 'MR';
    return `RMC-${code}-${year}${month}-${seq}`;
  }

  /** Crypto-random public tracking code, retried on the (rare) collision. */
  private async generateUniqueTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateTrackingCode('RMC-MAR');
      const clash = await this.applicationRepo.count({ where: { trackingCode: code } });
      if (clash === 0) return code;
    }
    throw new Error('Could not generate a unique tracking code');
  }

  // ── Secure tracking (phone-OTP gated) ────────────────────────────────────────

  /** Resolve a public tracking code to the OTP subject (id + contact phone), or null. */
  async findSubjectByCode(trackingCode: string): Promise<TrackingSubject | null> {
    const app = await this.applicationRepo.findOne({
      where: { trackingCode: (trackingCode || '').trim().toUpperCase() },
      select: { id: true, notificationPhone: true, groomPhone: true, bridePhone: true },
    });
    if (!app) return null;
    return { id: app.id, phone: app.notificationPhone || app.groomPhone || app.bridePhone };
  }

  /** Minimal, safe status view for a verified tracking session (by id). No PII beyond names. */
  async getTrackingInfo(id: string) {
    const app = await this.applicationRepo.findOne({ where: { id }, relations: ['statusHistory'] });
    if (!app) throw new NotFoundException('Application not found');
    const parties = await this.getPartyConfirmations(app.id);
    return {
      trackingCode: app.trackingCode,
      groomName: app.groomName,
      brideName: app.brideName,
      status: app.status,
      rejectionReason: app.rejectionReason,
      submittedAt: app.createdAt,
      updatedAt: app.updatedAt,
      parties: parties.map((p) => ({ role: p.role, confirmedAt: p.confirmedAt })),
    };
  }

  // ── Create / Draft ──────────────────────────────────────────────────────────

  async createDraft(
    applicantId: string,
    dto: CreateMarriageApplicationDto,
  ): Promise<MarriageApplication> {
    if (dto.groomNid === dto.brideNid) {
      throw new BadRequestException('Groom and bride cannot have the same National ID');
    }
    if (dto.witness1Nid === dto.witness2Nid) {
      throw new BadRequestException('Witnesses cannot have the same National ID');
    }
    if ([dto.witness1Nid, dto.witness2Nid].includes(dto.groomNid)) {
      throw new BadRequestException('A witness cannot be the same person as the groom');
    }
    if ([dto.witness1Nid, dto.witness2Nid].includes(dto.brideNid)) {
      throw new BadRequestException('A witness cannot be the same person as the bride');
    }

    const existing = await this.applicationRepo.findOne({
      where: [
        {
          groomNid: dto.groomNid,
          status: In([
            MarriageApplicationStatus.DRAFT,
            MarriageApplicationStatus.SUBMITTED,
            MarriageApplicationStatus.UNDER_REVIEW,
            MarriageApplicationStatus.AMENDMENTS_REQUESTED,
            MarriageApplicationStatus.APPROVED,
          ]),
        },
        {
          brideNid: dto.brideNid,
          status: In([
            MarriageApplicationStatus.DRAFT,
            MarriageApplicationStatus.SUBMITTED,
            MarriageApplicationStatus.UNDER_REVIEW,
            MarriageApplicationStatus.AMENDMENTS_REQUESTED,
            MarriageApplicationStatus.APPROVED,
          ]),
        },
      ],
    });
    if (existing) {
      throw new ConflictException(
        `An active application already exists for one of the partners (${existing.applicationNumber})`,
      );
    }

    const amountDue = await this.resolveMarriageFee(dto.venueType);
    const applicationNumber = await this.generateApplicationNumber(dto.district);
    const trackingCode = await this.generateUniqueTrackingCode();

    const app = this.applicationRepo.create({
      applicationNumber,
      trackingCode,
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
      status: MarriageApplicationStatus.DRAFT,
      paymentStatus: PaymentStatus.UNPAID,
    });

    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(
      saved.id,
      null,
      MarriageApplicationStatus.DRAFT,
      applicantId,
      'Application draft created',
    );
    return saved;
  }

  async updateDraft(
    id: string,
    applicantId: string,
    dto: Partial<CreateMarriageApplicationDto>,
  ): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);

    if (
      ![MarriageApplicationStatus.DRAFT, MarriageApplicationStatus.AMENDMENTS_REQUESTED].includes(
        app.status,
      )
    ) {
      throw new ForbiddenException(
        'Only draft or amendments-requested applications can be updated',
      );
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

  async submit(id: string, applicantId: string): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);

    if (
      app.status !== MarriageApplicationStatus.DRAFT &&
      app.status !== MarriageApplicationStatus.AMENDMENTS_REQUESTED
    ) {
      throw new BadRequestException(
        'Only draft or amendments-requested applications can be submitted',
      );
    }

    // MoMo payments must be confirmed by IntouchPay callback before submission
    if (app.paymentMethod === 'momo' && app.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Mobile Money payment must be completed before submitting the application.',
      );
    }

    const prevStatus = app.status;
    app.status = MarriageApplicationStatus.SUBMITTED;
    app.submittedAt = new Date();

    // Bank/cash payments are confirmed by admin after submission
    if (app.paymentStatus === PaymentStatus.UNPAID) {
      app.paymentStatus = PaymentStatus.PENDING_CASH;
    }

    const saved = await this.applicationRepo.save(app);

    await this.recordStatusChange(
      saved.id,
      prevStatus,
      MarriageApplicationStatus.SUBMITTED,
      applicantId,
      'Application submitted',
    );
    await this.sendSubmissionSms(saved);
    return saved;
  }

  async initiateUserMomoPayment(
    id: string,
    applicantId: string,
    mobilePhone: string,
  ): Promise<{
    application: MarriageApplication;
    transaction: MarriageTransaction;
    gatewayRef: string | null;
    responseCode: string;
    message: string;
  }> {
    const app = await this.findOwnApplication(id, applicantId);

    if (app.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed for this application');
    }
    if (
      app.status !== MarriageApplicationStatus.DRAFT &&
      app.status !== MarriageApplicationStatus.AMENDMENTS_REQUESTED
    ) {
      throw new BadRequestException('Application must be in draft status to initiate payment');
    }

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('MoMo (IntouchPay) credentials are not configured');
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

    app.paymentStatus = PaymentStatus.PROCESSING;
    app.paymentMethod = 'momo';
    await this.applicationRepo.save(app);

    const tx = this.transactionRepo.create({
      applicationId: app.id,
      method: 'momo',
      providerRef: requestTxnId,
      amount: app.amountDue,
      status:
        result.status === 'SUCCESSFUL'
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
      app.paymentStatus = PaymentStatus.PAID;
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

  /**
   * DEV ONLY — mark a draft application's payment as completed WITHOUT calling
   * the IntouchPay gateway, so local development can skip the MoMo push and go
   * straight to the provisional certificate. Hard-blocked in production: the
   * NODE_ENV guard runs before any DB mutation, so it can never fire on a real
   * deployment (which always sets NODE_ENV=production). Produces the same DB
   * state as a real successful MoMo payment (paymentStatus=paid + a completed
   * transaction); no SMS is sent in dev.
   */
  async devCompletePayment(id: string, applicantId: string): Promise<MarriageApplication> {
    // Defense-in-depth, deny-by-default: enabled ONLY when (a) NODE_ENV is not
    // 'production' AND (b) an explicit opt-in flag is set. The flag is NOT in
    // .env.example, so copying the template to a prod box can never enable the
    // bypass (which would otherwise let any authed user mark their own
    // application paid for free). Raw process.env is read deliberately —
    // ConfigService's 'app.nodeEnv' defaults to 'development' when unset.
    const bypassEnabled =
      process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_PAYMENT_BYPASS === 'true';
    if (!bypassEnabled) {
      throw new ForbiddenException(
        'Development payment bypass is disabled. To enable it locally, set NODE_ENV=development and ENABLE_DEV_PAYMENT_BYPASS=true.',
      );
    }

    const app = await this.findOwnApplication(id, applicantId);

    // Idempotent — already paid, nothing to do.
    if (app.paymentStatus === PaymentStatus.PAID) return app;

    if (
      app.status !== MarriageApplicationStatus.DRAFT &&
      app.status !== MarriageApplicationStatus.AMENDMENTS_REQUESTED
    ) {
      throw new BadRequestException('Application must be in draft status to complete payment');
    }

    // Ensure the fee is resolved (mirrors what draft creation stores).
    if (!app.amountDue || Number(app.amountDue) <= 0) {
      app.amountDue = await this.resolveMarriageFee(app.venueType);
    }

    app.paymentStatus = PaymentStatus.PAID;
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

  async cancel(id: string, applicantId: string): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);
    if (
      [
        MarriageApplicationStatus.APPROVED,
        MarriageApplicationStatus.COMPLETED,
        MarriageApplicationStatus.CLOSED,
      ].includes(app.status)
    ) {
      throw new ForbiddenException('Cannot cancel an approved or completed application');
    }
    const prev = app.status;
    app.status = MarriageApplicationStatus.CANCELLED;
    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(
      saved.id,
      prev,
      MarriageApplicationStatus.CANCELLED,
      applicantId,
      'Cancelled by applicant',
    );
    return saved;
  }

  async saveDocument(
    id: string,
    applicantId: string,
    dto: SaveDocumentDto,
  ): Promise<MarriageDocument> {
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

  // ── Queries ─────────────────────────────────────────────────────────────────

  async findOwnApplication(id: string, applicantId: string): Promise<MarriageApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id },
      relations: ['documents', 'statusHistory', 'transactions'],
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.applicantId !== applicantId) throw new ForbiddenException('Access denied');
    return app;
  }

  async findByApplicationNumber(applicationNumber: string): Promise<MarriageApplication | null> {
    return this.applicationRepo.findOne({
      where: { applicationNumber: applicationNumber.toUpperCase() },
      relations: ['documents', 'statusHistory'],
    });
  }

  async findAllByApplicant(applicantId: string): Promise<MarriageApplication[]> {
    return this.applicationRepo.find({
      where: { applicantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminFindAll(filters: {
    status?: string;
    paymentStatus?: string;
    venueType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      paymentStatus,
      venueType,
      search,
      dateFrom,
      dateTo,
      sort,
      order,
      page = 1,
      limit = 20,
    } = filters;

    const SORT_COLUMNS: Record<string, string> = {
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

    if (status) qb.andWhere('app.status = :status', { status });
    if (paymentStatus) qb.andWhere('app.paymentStatus = :paymentStatus', { paymentStatus });
    if (venueType) qb.andWhere('app.venueType = :venueType', { venueType });
    if (dateFrom) qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1); // inclusive end date
      qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (search) {
      qb.andWhere(
        '(app.groomName ILIKE :q OR app.brideName ILIKE :q OR app.applicationNumber ILIKE :q)',
        { q: `%${search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminFindOne(id: string): Promise<MarriageApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id },
      relations: ['documents', 'statusHistory', 'transactions'],
    });
    if (!app) throw new NotFoundException('Application not found');

    // Attach a lightweight applicant identity so admins can see who submitted
    // the application (the entity only stores applicant_id as a bare uuid).
    const applicant = app.applicantId
      ? await this.userRepo.findOne({ where: { id: app.applicantId } })
      : null;
    if (applicant) {
      (app as MarriageApplication & { applicant?: unknown }).applicant = {
        id: applicant.id,
        name: [applicant.firstName, applicant.lastName].filter(Boolean).join(' '),
        email: applicant.email,
        phone: applicant.phone,
      };
    }

    return app;
  }

  async adminVerifyDocument(
    applicationId: string,
    documentId: string,
    adminId: string,
    verified: boolean,
  ): Promise<MarriageApplication> {
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, applicationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    doc.verified = verified;
    doc.verifiedBy = verified ? adminId : null;
    doc.verifiedAt = verified ? new Date() : null;
    await this.documentRepo.save(doc);

    return this.adminFindOne(applicationId);
  }

  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    const prev = app.status;

    app.status = dto.status;
    app.reviewedBy = adminId;
    app.reviewedAt = new Date();

    if (dto.notes) app.reviewNotes = dto.notes;
    if (dto.rejectionReason) app.rejectionReason = dto.rejectionReason;
    if (dto.amendmentsRequestedText) app.amendmentsRequestedText = dto.amendmentsRequestedText;

    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(saved.id, prev, dto.status, adminId, dto.notes ?? null);
    await this.sendStatusChangeSms(saved, prev);
    return saved;
  }

  async adminScheduleCeremony(
    id: string,
    adminId: string,
    dto: ScheduleCeremonyDto,
  ): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    app.ceremonyDate = new Date(dto.ceremonyDate);
    app.ceremonyScheduledBy = adminId;
    app.ceremonyScheduledAt = new Date();
    if (dto.assignedImamId) app.assignedImamId = dto.assignedImamId;
    const saved = await this.applicationRepo.save(app);
    await this.sendCeremonyScheduledSms(saved);
    return saved;
  }

  async adminSaveWeddingPhoto(
    id: string,
    adminId: string,
    photoUrl: string,
  ): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    // Photo can be uploaded during any active validation stage or after completion
    const uploadableStatuses: MarriageApplicationStatus[] = [
      MarriageApplicationStatus.SUBMITTED,
      MarriageApplicationStatus.UNDER_REVIEW,
      MarriageApplicationStatus.AMENDMENTS_REQUESTED,
      MarriageApplicationStatus.APPROVED,
      MarriageApplicationStatus.COMPLETED,
    ];
    if (!uploadableStatuses.includes(app.status)) {
      throw new BadRequestException('Photo can only be uploaded for active applications');
    }
    app.weddingPhotoUrl = photoUrl;
    return this.applicationRepo.save(app);
  }

  /**
   * Attach the signed provisional certificate (a scan of the provisional cert
   * physically signed by the witnesses, officiant and couple). Stored as a
   * single `signed_provisional` document (one per application) and required
   * before the official certificate can be issued.
   */
  async adminSaveSignedProvisional(
    id: string,
    adminId: string,
    dto: { fileKey: string; fileName: string; fileSize: number; mimeType: string },
  ): Promise<MarriageApplication> {
    await this.adminFindOne(id);
    const existing = await this.documentRepo.findOne({
      where: { applicationId: id, documentType: DocumentType.SIGNED_PROVISIONAL },
    });
    if (existing) await this.documentRepo.remove(existing);
    const doc = this.documentRepo.create({
      applicationId: id,
      documentType: DocumentType.SIGNED_PROVISIONAL,
      fileKey: dto.fileKey,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      uploadedBy: adminId,
    });
    await this.documentRepo.save(doc);
    return this.adminFindOne(id);
  }

  async adminConfirmCashPayment(id: string, adminId: string): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    app.paymentStatus = PaymentStatus.PAID;
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

    if (app.status === MarriageApplicationStatus.DRAFT) {
      const prev = app.status;
      app.status = MarriageApplicationStatus.SUBMITTED;
      app.submittedAt = new Date();
      await this.recordStatusChange(
        id,
        prev,
        MarriageApplicationStatus.SUBMITTED,
        adminId,
        'Payment confirmed — application submitted',
      );
    }

    const saved = await this.applicationRepo.save(app);
    await this.sendPaymentConfirmedSms(saved);
    return saved;
  }

  async adminIssueCertificate(id: string, adminId: string): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    if (
      app.status !== MarriageApplicationStatus.APPROVED &&
      app.status !== MarriageApplicationStatus.COMPLETED
    ) {
      throw new BadRequestException('Certificate can only be issued for approved applications');
    }
    const hasSignedProvisional = app.documents?.some(
      (d) => d.documentType === DocumentType.SIGNED_PROVISIONAL,
    );
    if (!hasSignedProvisional) {
      throw new BadRequestException(
        'Attach the signed provisional certificate before issuing the certificate',
      );
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
    app.certificateUrl = `${frontendUrl}/en/certificates/${app.applicationNumber}`;
    app.certificateQrCode = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;
    app.certificateIssuedAt = new Date();
    app.certificateIssuedBy = adminId;

    const prev = app.status;
    app.status = MarriageApplicationStatus.CLOSED;
    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(
      saved.id,
      prev,
      MarriageApplicationStatus.CLOSED,
      adminId,
      'Certificate issued',
    );
    await this.sendStatusChangeSms(saved, prev);
    return saved;
  }

  async adminInitiateMomoPayment(
    id: string,
    adminId: string,
    mobilePhone: string,
  ): Promise<{
    application: MarriageApplication;
    transaction: MarriageTransaction;
    gatewayResponse: unknown;
  }> {
    const app = await this.adminFindOne(id);

    if (app.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed for this application');
    }

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('MoMo (IntouchPay) credentials are not configured');
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

    // Update application payment status to processing
    app.paymentStatus = PaymentStatus.PROCESSING;
    app.paymentMethod = 'momo';
    await this.applicationRepo.save(app);

    // Create a MarriageTransaction record
    const tx = this.transactionRepo.create({
      applicationId: app.id,
      method: 'momo',
      providerRef: requestTxnId,
      amount: app.amountDue,
      status:
        result.status === 'SUCCESSFUL'
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

    // If immediately successful (edge case), mark paid
    if (result.status === 'SUCCESSFUL') {
      app.paymentStatus = PaymentStatus.PAID;
      app.amountPaid = app.amountDue;
      savedTx.completedAt = new Date();
      await this.applicationRepo.save(app);
      await this.transactionRepo.save(savedTx);
      await this.sendPaymentConfirmedSms(app);
    }

    return { application: app, transaction: savedTx, gatewayResponse: result };
  }

  /** Polls IntouchPay gateway directly and updates DB — used by the applicant's waiting screen. */
  async checkUserMomoPaymentStatus(
    id: string,
    applicantId: string,
  ): Promise<{
    paymentStatus: string;
    gatewayStatus: string;
    responseCode: string;
    message: string;
  }> {
    const app = await this.findOwnApplication(id, applicantId);

    // Already resolved — no need to hit the gateway
    if (app.paymentStatus === PaymentStatus.PAID) {
      return {
        paymentStatus: 'paid',
        gatewayStatus: 'SUCCESSFUL',
        responseCode: '01',
        message: 'Payment already confirmed',
      };
    }
    if (app.paymentStatus === PaymentStatus.FAILED) {
      return {
        paymentStatus: 'failed',
        gatewayStatus: 'FAILED',
        responseCode: '',
        message: 'Payment failed',
      };
    }

    // Find the most recent pending MoMo transaction for this application
    const tx = await this.transactionRepo.findOne({
      where: { applicationId: id, method: 'momo', status: 'pending' },
      order: { initiatedAt: 'DESC' },
    });
    if (!tx) {
      return {
        paymentStatus: app.paymentStatus,
        gatewayStatus: 'PENDING',
        responseCode: '1000',
        message: 'No active MoMo transaction found',
      };
    }

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      return {
        paymentStatus: app.paymentStatus,
        gatewayStatus: 'PENDING',
        responseCode: '',
        message: 'Credentials not configured',
      };
    }

    const statusResult = await this.intouchPay.getTransactionStatus({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      requestTransactionId: tx.providerRef ?? '',
      transactionId: String((tx.metadata as Record<string, unknown>)?.gatewayTransactionId ?? ''),
      gatewayBaseUrl: creds.gatewayUrl,
    });

    if (statusResult.status !== 'PENDING') {
      tx.status = statusResult.status === 'SUCCESSFUL' ? 'completed' : 'failed';
      tx.completedAt = new Date();
      await this.transactionRepo.save(tx);

      if (statusResult.status === 'SUCCESSFUL') {
        app.paymentStatus = PaymentStatus.PAID;
        app.amountPaid = app.amountDue;
        await this.applicationRepo.save(app);
        await this.sendPaymentConfirmedSms(app);
      } else {
        app.paymentStatus = PaymentStatus.FAILED;
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

  async adminGetMomoPaymentStatus(
    id: string,
    transactionId: string,
  ): Promise<{ status: string; responseCode: string; message: string }> {
    const app = await this.adminFindOne(id);
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId, applicationId: id },
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('IntouchPay credentials not configured');
    }

    const statusResult = await this.intouchPay.getTransactionStatus({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      requestTransactionId: tx.providerRef ?? '',
      transactionId: String((tx.metadata as Record<string, unknown>)?.gatewayTransactionId ?? ''),
      gatewayBaseUrl: creds.gatewayUrl,
    });

    // Update records if status changed
    if (statusResult.status !== 'PENDING' && tx.status === 'pending') {
      tx.status = statusResult.status === 'SUCCESSFUL' ? 'completed' : 'failed';
      tx.completedAt = new Date();
      await this.transactionRepo.save(tx);

      if (statusResult.status === 'SUCCESSFUL' && app.paymentStatus !== PaymentStatus.PAID) {
        app.paymentStatus = PaymentStatus.PAID;
        app.amountPaid = app.amountDue;
        await this.applicationRepo.save(app);
        await this.sendPaymentConfirmedSms(app);
      } else if (statusResult.status === 'FAILED') {
        app.paymentStatus = PaymentStatus.FAILED;
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
      .where('app.paymentStatus = :ps', { ps: PaymentStatus.PAID })
      .getRawOne();

    return { total, byStatus, revenue: Number(revenue?.total ?? 0) };
  }

  // ── Public verification ─────────────────────────────────────────────────────

  async publicVerify(applicationNumber: string) {
    const app = await this.applicationRepo.findOne({
      where: {
        applicationNumber: applicationNumber.toUpperCase(),
        status: MarriageApplicationStatus.CLOSED,
      },
    });
    if (!app) throw new NotFoundException('Certificate not found or not yet issued');
    return {
      applicationNumber: app.applicationNumber,
      groomName: app.groomName,
      brideName: app.brideName,
      ceremonyDate: app.ceremonyDate,
      issuedAt: app.certificateIssuedAt,
      status: 'valid',
    };
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private async recordStatusChange(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ) {
    const history = this.statusHistoryRepo.create({
      applicationId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.statusHistoryRepo.save(history);
  }

  private async getRecipientPhone(app: MarriageApplication): Promise<string> {
    if (app.notificationPhone) return app.notificationPhone;
    return this.getApplicantPhone(app.applicantId);
  }

  private async getApplicantPhone(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return (user as any)?.phone ?? '';
  }

  // ── SMS notifications (via InTouch SmsService) ────────────────────────────

  /**
   * Dispatch an SMS through the InTouch gateway.
   * Skips silently when the recipient phone is missing.
   * Never throws — a failed SMS must not break the caller's operation.
   */
  private dispatchSms(to: string, message: string): void {
    if (!to) {
      this.logger.warn('SMS skipped: no recipient phone number');
      return;
    }
    // Fire-and-forget — SmsService.sendSms() catches all errors internally
    void this.smsService.sendSms(to, message);
  }

  private async sendSubmissionSms(app: MarriageApplication): Promise<void> {
    if (!this.notifSettings.isSmsEnabled('marriage.submission')) return;
    const phone = await this.getRecipientPhone(app);
    this.dispatchSms(
      phone,
      SmsTemplates.submission(app.trackingCode, app.groomName, app.brideName),
    );
  }

  private async sendStatusChangeSms(
    app: MarriageApplication,
    _previousStatus: string,
  ): Promise<void> {
    if (!this.notifSettings.isSmsEnabled('marriage.status_change')) return;
    const phone = await this.getRecipientPhone(app);

    const message = this.buildStatusMessage(app);
    if (!message) return;

    this.dispatchSms(phone, message);
  }

  private buildStatusMessage(app: MarriageApplication): string | null {
    switch (app.status) {
      case 'under_review':
        return SmsTemplates.underReview(app.trackingCode);
      case 'approved':
        return SmsTemplates.approved(app.trackingCode);
      case 'rejected':
        return SmsTemplates.rejected(app.trackingCode, app.rejectionReason);
      case 'amendments_requested':
        return SmsTemplates.amendmentsRequested(app.trackingCode, app.amendmentsRequestedText);
      case 'completed':
        return SmsTemplates.completed(app.trackingCode);
      case 'closed':
        return SmsTemplates.closed(app.trackingCode);
      default:
        return null;
    }
  }

  private async sendCeremonyScheduledSms(app: MarriageApplication): Promise<void> {
    if (!this.notifSettings.isSmsEnabled('marriage.ceremony_scheduled')) return;
    const phone = await this.getRecipientPhone(app);
    const date = app.ceremonyDate
      ? new Date(app.ceremonyDate).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'TBC';

    this.dispatchSms(phone, SmsTemplates.ceremonyScheduled(app.applicationNumber, date));
  }

  private async sendPaymentConfirmedSms(app: MarriageApplication): Promise<void> {
    if (!this.notifSettings.isSmsEnabled('marriage.payment_confirmed')) return;
    const phone = await this.getRecipientPhone(app);
    const amount = Number(app.amountPaid || app.amountDue).toLocaleString('en-RW');

    this.dispatchSms(phone, SmsTemplates.paymentConfirmed(app.applicationNumber, amount));
  }

  // ── Party Confirmations ─────────────────────────────────────────────────────

  async addParties(
    applicationId: string,
    requesterId: string,
    parties: Array<{ role: PartyRole; name?: string; nid?: string; phone?: string }>,
  ): Promise<MarriagePartyConfirmation[]> {
    const app = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.applicantId !== requesterId) throw new ForbiddenException('Not your application');

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');

    const results: MarriagePartyConfirmation[] = [];
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
        this.dispatchSms(
          party.phone,
          SmsTemplates.partyConfirmation(app.applicationNumber, party.role, link),
        );
      } else {
        this.logger.log(`[Confirmation token for ${party.role}] ${token}`);
      }
    }

    return results;
  }

  async getPartyConfirmations(applicationId: string): Promise<MarriagePartyConfirmation[]> {
    return this.confirmationRepo.find({
      where: { applicationId },
      order: { role: 'ASC' },
    });
  }

  async lookupByToken(token: string): Promise<{
    confirmation: MarriagePartyConfirmation;
    application: Partial<MarriageApplication>;
  }> {
    const conf = await this.confirmationRepo.findOne({ where: { confirmationToken: token } });
    if (!conf) throw new NotFoundException('Confirmation link not found or already used');
    const app = await this.applicationRepo.findOne({ where: { id: conf.applicationId } });
    if (!app) throw new NotFoundException('Application not found');
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

  async confirmParty(token: string, notes?: string): Promise<MarriagePartyConfirmation> {
    const conf = await this.confirmationRepo.findOne({ where: { confirmationToken: token } });
    if (!conf) throw new NotFoundException('Confirmation link not found');
    if (conf.confirmedAt) throw new ConflictException('Already confirmed');
    conf.confirmedAt = new Date();
    if (notes) conf.notes = notes;
    conf.confirmationToken = null; // consume token so it can't be reused
    return this.confirmationRepo.save(conf);
  }
}
