import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Like, FindOptionsWhere, In } from 'typeorm';
import * as nodemailer from 'nodemailer';
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
import { User } from '../users/entities/user.entity';
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
    // Validate NID uniqueness across fields
    const niids = [dto.groomNid, dto.brideNid, dto.witness1Nid, dto.witness2Nid].filter(Boolean);
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

    // Check for existing active application for the same couple
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
      notificationEmail: dto.notificationEmail ?? null,
      groomName: dto.groomName,
      groomNid: dto.groomNid,
      groomPhone: dto.groomPhone ?? null,
      brideName: dto.brideName,
      brideNid: dto.brideNid,
      bridePhone: dto.bridePhone ?? null,
      witness1Nid: dto.witness1Nid,
      witness1Name: dto.witness1Name ?? null,
      witness2Nid: dto.witness2Nid,
      witness2Name: dto.witness2Name ?? null,
      waliName: dto.waliName ?? null,
      waliNid: dto.waliNid ?? null,
      waliPhone: dto.waliPhone ?? null,
      mahrAmount: dto.mahrAmount ?? null,
      mahrDescription: dto.mahrDescription ?? null,
      requestedOfficiant: dto.requestedOfficiant ?? null,
      venueType: dto.venueType,
      province: dto.province ?? null,
      district: dto.district ?? null,
      mosqueId: dto.mosqueId ?? null,
      venueAddress: dto.venueAddress ?? null,
      preferredDateFrom: dto.preferredDateFrom ? new Date(dto.preferredDateFrom) : null,
      preferredDateTo: dto.preferredDateTo ? new Date(dto.preferredDateTo) : null,
      paymentMethod: dto.paymentMethod ?? null,
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

    // For cash/bank, allow submission and set payment to pending_cash / processing
    const prevStatus = app.status;
    app.status = MarriageApplicationStatus.SUBMITTED;
    app.submittedAt = new Date();

    if (app.paymentMethod === 'cash') {
      app.paymentStatus = PaymentStatus.PENDING_CASH;
    } else if (app.paymentMethod === 'bank') {
      app.paymentStatus = PaymentStatus.PROCESSING;
    }

    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(saved.id, prevStatus, MarriageApplicationStatus.SUBMITTED, applicantId, 'Application submitted');
    await this.sendSubmissionEmail(saved);
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
    // Replace existing document of same type if re-uploading
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
    return app;
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
    await this.sendStatusChangeEmail(saved, prev);
    return saved;
  }

  async adminScheduleCeremony(id: string, adminId: string, dto: ScheduleCeremonyDto): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    app.ceremonyDate = new Date(dto.ceremonyDate);
    app.ceremonyScheduledBy = adminId;
    app.ceremonyScheduledAt = new Date();
    if (dto.assignedImamId) app.assignedImamId = dto.assignedImamId;
    return this.applicationRepo.save(app);
  }

  async adminSaveWeddingPhoto(id: string, adminId: string, photoUrl: string): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    if (app.status !== MarriageApplicationStatus.COMPLETED) {
      throw new BadRequestException('Wedding photo can only be uploaded after the ceremony is marked completed');
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

    // Auto-advance to submitted if still in DRAFT
    if (app.status === MarriageApplicationStatus.DRAFT) {
      const prev = app.status;
      app.status = MarriageApplicationStatus.SUBMITTED;
      app.submittedAt = new Date();
      await this.recordStatusChange(id, prev, MarriageApplicationStatus.SUBMITTED, adminId, 'Payment confirmed — application submitted');
    }

    return this.applicationRepo.save(app);
  }

  async adminIssueCertificate(id: string, adminId: string): Promise<MarriageApplication> {
    const app = await this.adminFindOne(id);
    if (app.status !== MarriageApplicationStatus.APPROVED && app.status !== MarriageApplicationStatus.COMPLETED) {
      throw new BadRequestException('Certificate can only be issued for approved applications');
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
    // Public certificate page (QR code target)
    app.certificateUrl = `${frontendUrl}/en/certificates/${app.applicationNumber}`;
    // QR code points to the public status tracker so the couple can also see the certificate link
    app.certificateQrCode = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;
    app.certificateIssuedAt = new Date();
    app.certificateIssuedBy = adminId;

    const prev = app.status;
    app.status = MarriageApplicationStatus.CLOSED;
    const saved = await this.applicationRepo.save(app);
    await this.recordStatusChange(saved.id, prev, MarriageApplicationStatus.CLOSED, adminId, 'Certificate issued');
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
    const history = this.statusHistoryRepo.create({
      applicationId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.statusHistoryRepo.save(history);
  }

  private async getRecipientEmail(app: MarriageApplication): Promise<string> {
    if (app.notificationEmail) return app.notificationEmail;
    return this.getApplicantEmail(app.applicantId);
  }

  private async sendSubmissionEmail(app: MarriageApplication) {
    try {
      const transporter = this.createMailTransporter();
      if (!transporter) return;

      const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
      const trackUrl = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;
      const fee = Number(app.amountDue).toLocaleString('en-RW');
      const venue = app.venueType === 'mosque' ? 'Mosque ceremony' : 'Outside mosque';
      const location = [app.district, app.province].filter(Boolean).join(', ');

      const paymentBlock = app.paymentMethod === 'momo'
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Mobile Money Payment</p>
              <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
                Dial <strong>*182#</strong> → Pay Bills → RMC Services<br>
                Amount: <strong>${fee} RWF</strong><br>
                Reference: <strong>${app.applicationNumber}</strong>
              </p>
            </td></tr>
           </table>`
        : app.paymentMethod === 'bank'
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;color:#1e40af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Bank Transfer</p>
              <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
                Bank: <strong>Bank of Kigali</strong> · Acc: <strong>00012-345678-01</strong><br>
                Name: Rwanda Muslim Community<br>
                Amount: <strong>${fee} RWF</strong> · Reference: <strong>${app.applicationNumber}</strong>
              </p>
            </td></tr>
           </table>`
        : `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;color:#854d0e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Cash Payment</p>
              <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
                Visit the RMC office with your Application ID and pay <strong>${fee} RWF</strong> at the service desk.<br>
                <span style="color:#6b7280;">Office hours: Monday – Friday, 8:00 AM – 5:00 PM</span>
              </p>
            </td></tr>
           </table>`;

      const steps = [
        'Our team reviews your application (1–3 business days)',
        'You receive an email notification on every status change',
        'Once approved, your Nikah date is confirmed with an assigned Imam',
        'Your official marriage certificate is issued upon completion',
      ];

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Marriage Application Confirmed — RMC</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- ── Header ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#15803d 0%,#166534 100%);padding:36px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Rwanda Muslim Community</p>
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.25;">Nikah Application<br>Confirmed ✓</h1>
                </td>
                <td align="right" valign="middle" style="padding-left:16px;">
                  <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;text-align:center;line-height:56px;font-size:28px;">💍</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Application ID ── -->
        <tr>
          <td style="background:#f0fdf4;border-bottom:2px solid #dcfce7;padding:28px 40px;text-align:center;">
            <p style="margin:0 0 8px;color:#166534;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Your Application ID</p>
            <p style="margin:0;color:#15803d;font-size:30px;font-weight:800;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${app.applicationNumber}</p>
            <p style="margin:10px 0 0;color:#4ade80;font-size:12px;line-height:1.5;">Keep this ID safe — you'll need it to track your application status.</p>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
              Assalamu Alaikum,<br><br>
              Your marriage application has been successfully submitted to RMC. Our team will review it and you will be notified by email at every step.
            </p>

            <!-- Application details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="background:#f9fafb;padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Couple</p>
                  <p style="margin:0;color:#111827;font-size:16px;font-weight:700;">${app.groomName} &amp; ${app.brideName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Venue</p>
                  <p style="margin:0;color:#374151;font-size:14px;">${venue}${location ? ` &nbsp;·&nbsp; ${location}` : ''}</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Preferred Dates</p>
                  <p style="margin:0;color:#374151;font-size:14px;">${app.preferredDateFrom ? new Date(app.preferredDateFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not specified'}${app.preferredDateTo ? ` → ${new Date(app.preferredDateTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0 0 3px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Service Fee</p>
                  <p style="margin:0;color:#15803d;font-size:22px;font-weight:800;">${fee} RWF</p>
                </td>
              </tr>
            </table>

            <!-- Payment instructions -->
            ${paymentBlock}

            <!-- Next steps -->
            <p style="margin:0 0 14px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">What happens next</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              ${steps.map((step, i) => `
              <tr>
                <td style="padding:6px 0;" valign="top">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td valign="top" style="padding-top:1px;">
                      <div style="width:24px;height:24px;background:#15803d;border-radius:50%;text-align:center;line-height:24px;color:#ffffff;font-size:11px;font-weight:800;font-family:monospace;">${i + 1}</div>
                    </td>
                    <td style="padding-left:12px;color:#4b5563;font-size:14px;line-height:1.6;">${step}</td>
                  </tr></table>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${trackUrl}" style="display:inline-block;background:#15803d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:10px;letter-spacing:0.3px;">Track Your Application &rarr;</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:13px;font-weight:600;">Rwanda Muslim Community</p>
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Questions? Contact us at <a href="mailto:nikah@rmc.rw" style="color:#15803d;text-decoration:none;font-weight:600;">nikah@rmc.rw</a></p>
            <p style="margin:10px 0 0;color:#d1d5db;font-size:11px;">This is an automated message — please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

      await transporter.sendMail({
        from: `"RMC Nikah Services" <${this.configService.get('app.smtp.from', 'noreply@rmc.org.rw')}>`,
        to: await this.getRecipientEmail(app),
        subject: `Application Confirmed — ${app.applicationNumber} | RMC Nikah`,
        html,
      });
    } catch (err) {
      this.logger.warn(`Failed to send submission email: ${err}`);
    }
  }

  private async sendStatusChangeEmail(app: MarriageApplication, previousStatus: string) {
    try {
      const transporter = this.createMailTransporter();
      if (!transporter) return;

      const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
      const trackUrl = `${frontendUrl}/en/services/marriage/status?id=${app.applicationNumber}`;

      const statusConfig: Record<string, { subject: string; headline: string; color: string; bg: string; border: string; message: string }> = {
        under_review: {
          subject: `Under Review — ${app.applicationNumber}`,
          headline: 'Your application is under review',
          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
          message: 'An RMC officer is currently reviewing your application. This typically takes 1–3 business days.',
        },
        approved: {
          subject: `Application Approved — ${app.applicationNumber}`,
          headline: 'Your application has been approved 🎉',
          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
          message: 'Congratulations! Your Nikah application has been approved. Our team will be in touch to confirm your ceremony date and assigned Imam.',
        },
        rejected: {
          subject: `Application Update — ${app.applicationNumber}`,
          headline: 'Application could not be approved',
          color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
          message: 'Unfortunately, we were unable to approve your application at this time. Please see the details below.',
        },
        amendments_requested: {
          subject: `Amendments Required — ${app.applicationNumber}`,
          headline: 'Amendments are required',
          color: '#d97706', bg: '#fffbeb', border: '#fde68a',
          message: 'Our team has reviewed your application and requires some amendments before it can be approved.',
        },
        completed: {
          subject: `Ceremony Completed — ${app.applicationNumber}`,
          headline: 'Nikah ceremony completed',
          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
          message: 'Your Nikah ceremony has been marked as completed. Your marriage certificate will be issued shortly.',
        },
        closed: {
          subject: `Certificate Ready — ${app.applicationNumber}`,
          headline: 'Your marriage certificate is ready ✓',
          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
          message: 'Your official RMC marriage certificate has been issued. You can verify its authenticity via the QR code on the certificate.',
        },
      };

      const cfg = statusConfig[app.status];
      if (!cfg) return;

      const notes = app.rejectionReason || app.amendmentsRequestedText || app.reviewNotes;
      const notesBlock = notes
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;margin:20px 0;">
             <tr><td style="padding:16px 20px;">
               <p style="margin:0 0 6px;color:${cfg.color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Officer Notes</p>
               <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">${notes}</p>
             </td></tr>
           </table>`
        : '';

      const ceremonyBlock = app.ceremonyDate
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:20px 0;">
             <tr><td style="padding:16px 20px;">
               <p style="margin:0 0 6px;color:#166534;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Ceremony Date</p>
               <p style="margin:0;color:#15803d;font-size:18px;font-weight:700;">${new Date(app.ceremonyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
             </td></tr>
           </table>`
        : '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#15803d 0%,#166534 100%);padding:32px 40px;">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Rwanda Muslim Community</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Application Status Update</h1>
        </td>
      </tr>

      <!-- Status badge -->
      <tr>
        <td style="background:${cfg.bg};border-bottom:2px solid ${cfg.border};padding:22px 40px;">
          <p style="margin:0;color:${cfg.color};font-size:17px;font-weight:700;">${cfg.headline}</p>
          <p style="margin:6px 0 0;color:#6b7280;font-size:12px;font-family:monospace;letter-spacing:1px;">${app.applicationNumber}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 40px 28px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">${cfg.message}</p>
          ${notesBlock}
          ${ceremonyBlock}
          <p style="margin:0 0 4px;color:#374151;font-size:14px;"><strong>Couple:</strong> ${app.groomName} &amp; ${app.brideName}</p>
          <p style="margin:0 0 28px;color:#374151;font-size:14px;"><strong>Application:</strong> <span style="font-family:monospace;">${app.applicationNumber}</span></p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${trackUrl}" style="display:inline-block;background:#15803d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">View Application &rarr;</a>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:22px 40px;text-align:center;">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Rwanda Muslim Community · Nikah Services</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:nikah@rmc.rw" style="color:#15803d;font-weight:600;text-decoration:none;">nikah@rmc.rw</a></p>
          <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">Automated message — please do not reply.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;

      await transporter.sendMail({
        from: `"RMC Nikah Services" <${this.configService.get('app.smtp.from', 'noreply@rmc.org.rw')}>`,
        to: await this.getRecipientEmail(app),
        subject: cfg.subject,
        html,
      });
    } catch (err) {
      this.logger.warn(`Failed to send status change email: ${err}`);
    }
  }

  private createMailTransporter() {
    const host = this.configService.get<string>('app.smtp.host');
    if (!host) return null;
    const user = this.configService.get<string>('app.smtp.user');
    return nodemailer.createTransport({
      host,
      port:   this.configService.get<number>('app.smtp.port', 465),
      secure: this.configService.get<boolean>('app.smtp.secure', false),
      auth:   user ? { user, pass: this.configService.get<string>('app.smtp.pass') } : undefined,
    });
  }

  private async getApplicantEmail(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.email ?? '';
  }
}
