import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger,
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
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import { MarriagePartyConfirmation, PartyRole } from './entities/marriage-party-confirmation.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';

const MOSQUE_FEE = 30000;
const OUTSIDE_FEE = 200000;

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
  ) {}

  // ── Application Number ──────────────────────────────────────────────────────

  private async generateApplicationNumber(): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT nextval('marriage_application_seq') AS seq`,
    );
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `RMC-MR-${year}${month}-${seq}`;
  }

  // ── Create / Draft ──────────────────────────────────────────────────────────

  async createDraft(applicantId: string, dto: CreateMarriageApplicationDto): Promise<MarriageApplication> {
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
        { groomNid: dto.groomNid, status: In([
          MarriageApplicationStatus.DRAFT,
          MarriageApplicationStatus.SUBMITTED,
          MarriageApplicationStatus.UNDER_REVIEW,
          MarriageApplicationStatus.AMENDMENTS_REQUESTED,
          MarriageApplicationStatus.APPROVED,
        ]) },
        { brideNid: dto.brideNid, status: In([
          MarriageApplicationStatus.DRAFT,
          MarriageApplicationStatus.SUBMITTED,
          MarriageApplicationStatus.UNDER_REVIEW,
          MarriageApplicationStatus.AMENDMENTS_REQUESTED,
          MarriageApplicationStatus.APPROVED,
        ]) },
      ],
    });
    if (existing) {
      throw new ConflictException(
        `An active application already exists for one of the partners (${existing.applicationNumber})`,
      );
    }

    const amountDue = dto.venueType === VenueType.MOSQUE ? MOSQUE_FEE : OUTSIDE_FEE;
    const applicationNumber = await this.generateApplicationNumber();

    const app = this.applicationRepo.create({
      applicationNumber,
      applicantId,
      notificationPhone: dto.notificationPhone,
      groomName: dto.groomName,
      groomNid: dto.groomNid,
      groomPhone: dto.groomPhone,
      brideName: dto.brideName,
      brideNid: dto.brideNid,
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
    await this.recordStatusChange(saved.id, null, MarriageApplicationStatus.DRAFT, applicantId, 'Application draft created');
    return saved;
  }

  async updateDraft(id: string, applicantId: string, dto: Partial<CreateMarriageApplicationDto>): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);

    if (![MarriageApplicationStatus.DRAFT, MarriageApplicationStatus.AMENDMENTS_REQUESTED].includes(app.status)) {
      throw new ForbiddenException('Only draft or amendments-requested applications can be updated');
    }

    Object.assign(app, {
      notificationPhone: dto.notificationPhone ?? app.notificationPhone,
      groomName: dto.groomName ?? app.groomName,
      groomNid: dto.groomNid ?? app.groomNid,
      groomPhone: dto.groomPhone ?? app.groomPhone,
      brideName: dto.brideName ?? app.brideName,
      brideNid: dto.brideNid ?? app.brideNid,
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
      preferredDateFrom: dto.preferredDateFrom ? new Date(dto.preferredDateFrom) : app.preferredDateFrom,
      preferredDateTo: dto.preferredDateTo ? new Date(dto.preferredDateTo) : app.preferredDateTo,
      paymentMethod: dto.paymentMethod ?? app.paymentMethod,
      amountDue: dto.venueType ? (dto.venueType === VenueType.MOSQUE ? MOSQUE_FEE : OUTSIDE_FEE) : app.amountDue,
    });

    return this.applicationRepo.save(app);
  }

  async submit(id: string, applicantId: string): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);

    if (app.status !== MarriageApplicationStatus.DRAFT && app.status !== MarriageApplicationStatus.AMENDMENTS_REQUESTED) {
      throw new BadRequestException('Only draft or amendments-requested applications can be submitted');
    }

    const prevStatus = app.status;
    app.status = MarriageApplicationStatus.SUBMITTED;
    app.submittedAt = new Date();

    // Payment is auto-settled on submission — every application is marked paid
    // (no separate payment / confirmation step).
    const alreadyPaid = app.paymentStatus === PaymentStatus.PAID;
    app.paymentStatus = PaymentStatus.PAID;
    app.amountPaid = app.amountDue;

    const saved = await this.applicationRepo.save(app);

    if (!alreadyPaid) {
      const tx = this.transactionRepo.create({
        applicationId: saved.id,
        method: app.paymentMethod ?? 'auto',
        amount: app.amountDue,
        status: 'completed',
        completedAt: new Date(),
        metadata: { auto: true, reason: 'Auto-marked paid on submission' },
      });
      await this.transactionRepo.save(tx);
    }

    await this.recordStatusChange(saved.id, prevStatus, MarriageApplicationStatus.SUBMITTED, applicantId, 'Application submitted');
    await this.sendSubmissionSms(saved);
    return saved;
  }

  async cancel(id: string, applicantId: string): Promise<MarriageApplication> {
    const app = await this.findOwnApplication(id, applicantId);
    if ([MarriageApplicationStatus.APPROVED, MarriageApplicationStatus.COMPLETED, MarriageApplicationStatus.CLOSED].includes(app.status)) {
      throw new ForbiddenException('Cannot cancel an approved or completed application');
    }
    const prev = app.status;
    app.status = MarriageApplicationStatus.CANCELLED;
    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(saved.id, prev, MarriageApplicationStatus.CANCELLED, applicantId, 'Cancelled by applicant');
    return saved;
  }

  async saveDocument(id: string, applicantId: string, dto: SaveDocumentDto): Promise<MarriageDocument> {
    const app = await this.findOwnApplication(id, applicantId);
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
    page?: number;
    limit?: number;
  }) {
    const { status, paymentStatus, venueType, search, page = 1, limit = 20 } = filters;

    const qb = this.applicationRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.documents', 'docs')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('app.status = :status', { status });
    if (paymentStatus) qb.andWhere('app.paymentStatus = :paymentStatus', { paymentStatus });
    if (venueType) qb.andWhere('app.venueType = :venueType', { venueType });
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

  async adminUpdateStatus(id: string, adminId: string, dto: UpdateApplicationStatusDto): Promise<MarriageApplication> {
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

  async adminScheduleCeremony(id: string, adminId: string, dto: ScheduleCeremonyDto): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    app.ceremonyDate = new Date(dto.ceremonyDate);
    app.ceremonyScheduledBy = adminId;
    app.ceremonyScheduledAt = new Date();
    if (dto.assignedImamId) app.assignedImamId = dto.assignedImamId;
    const saved = await this.applicationRepo.save(app);
    await this.sendCeremonyScheduledSms(saved);
    return saved;
  }

  async adminSaveWeddingPhoto(id: string, adminId: string, photoUrl: string): Promise<MarriageApplication> {
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
      await this.recordStatusChange(id, prev, MarriageApplicationStatus.SUBMITTED, adminId, 'Payment confirmed — application submitted');
    }

    const saved = await this.applicationRepo.save(app);
    await this.sendPaymentConfirmedSms(saved);
    return saved;
  }

  async adminIssueCertificate(id: string, adminId: string): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    if (app.status !== MarriageApplicationStatus.APPROVED && app.status !== MarriageApplicationStatus.COMPLETED) {
      throw new BadRequestException('Certificate can only be issued for approved applications');
    }
    if (!app.weddingPhotoUrl) {
      throw new BadRequestException('Upload the marriage photo before issuing the certificate');
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
    app.certificateUrl = `${frontendUrl}/en/certificates/${app.applicationNumber}`;
    app.certificateQrCode = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;
    app.certificateIssuedAt = new Date();
    app.certificateIssuedBy = adminId;

    const prev = app.status;
    app.status = MarriageApplicationStatus.CLOSED;
    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(saved.id, prev, MarriageApplicationStatus.CLOSED, adminId, 'Certificate issued');
    await this.sendStatusChangeSms(saved, prev);
    return saved;
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
      where: { applicationNumber: applicationNumber.toUpperCase(), status: MarriageApplicationStatus.CLOSED },
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
    const history = this.statusHistoryRepo.create({ applicationId, fromStatus, toStatus, changedBy, notes });
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

  // ── SMS notifications ──────────────────────────────────────────────────────

  private async sendSms(to: string, message: string): Promise<void> {
    if (!to) {
      this.logger.warn('SMS skipped: no recipient phone number');
      return;
    }

    const apiKey  = this.configService.get<string>('app.sms.apiKey');
    const username = this.configService.get<string>('app.sms.username');
    const from    = this.configService.get<string>('app.sms.from', 'RMC');

    if (!apiKey || !username) {
      this.logger.log(`[SMS→${to}] ${message}`);
      return;
    }

    try {
      const body = new URLSearchParams({
        username,
        to,
        message,
        from,
      });

      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        this.logger.warn(`SMS send failed (${res.status}): ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(`SMS error: ${err}`);
    }
  }

  private async sendSubmissionSms(app: MarriageApplication): Promise<void> {
    const phone = await this.getRecipientPhone(app);

    // Payment is settled automatically on submission, so there are no payment
    // instructions to send — just confirm receipt and let them track it.
    await this.sendSms(
      phone,
      `RMC Nikah: Application ${app.applicationNumber} submitted for ${app.groomName} & ${app.brideName}. Payment received — our team will review it shortly. Track: rmc.org.rw`,
    );
  }

  private async sendStatusChangeSms(app: MarriageApplication, _previousStatus: string): Promise<void> {
    const phone = await this.getRecipientPhone(app);

    const statusMessages: Record<string, string> = {
      under_review: `Your Nikah application ${app.applicationNumber} is now under review. We'll notify you of any updates.`,
      approved: `Congratulations! Your Nikah application ${app.applicationNumber} has been approved. Our team will confirm your ceremony date soon.`,
      rejected: `Your Nikah application ${app.applicationNumber} could not be approved. ${app.rejectionReason ? 'Reason: ' + app.rejectionReason : ''} Contact nikah@rmc.rw for assistance.`,
      amendments_requested: `Amendments required for application ${app.applicationNumber}. ${app.amendmentsRequestedText ?? ''} Log in to update your application.`,
      completed: `Your Nikah ceremony is complete! Application ${app.applicationNumber}. Your certificate will be issued shortly.`,
      closed: `Your RMC marriage certificate is ready. Application ${app.applicationNumber}. Visit rmc.org.rw to download it.`,
    };

    const message = statusMessages[app.status];
    if (!message) return;

    await this.sendSms(phone, message);
  }

  private async sendCeremonyScheduledSms(app: MarriageApplication): Promise<void> {
    const phone = await this.getRecipientPhone(app);
    const date = app.ceremonyDate
      ? new Date(app.ceremonyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'TBC';

    await this.sendSms(
      phone,
      `RMC Nikah: Your ceremony date is confirmed — ${date}. Application: ${app.applicationNumber}. Assalamu Alaikum!`,
    );
  }

  private async sendPaymentConfirmedSms(app: MarriageApplication): Promise<void> {
    const phone = await this.getRecipientPhone(app);
    const fee = Number(app.amountPaid || app.amountDue).toLocaleString('en-RW');

    await this.sendSms(
      phone,
      `RMC Nikah: Payment of ${fee} RWF received for application ${app.applicationNumber}. Your application is now being processed.`,
    );
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

      if (party.phone) {
        const link = `${frontendUrl}/en/services/marriage/confirm/${token}`;
        await this.sendSms(
          party.phone,
          `RMC Nikah (${app.applicationNumber}): You have been listed as ${party.role}. Please confirm your participation: ${link}`,
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
