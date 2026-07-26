import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, IsNull } from 'typeorm';
import { TenderApplication, TenderApplicationStatus } from './entities/tender-application.entity';
import type { TrackingSubject } from '../tracking/tracking-verification.service';
import { generateTrackingCode } from '../tracking/tracking-code.util';
import {
  TenderApplicationDocument,
  TenderDocumentType,
  REQUIRED_TENDER_DOCUMENTS,
} from './entities/tender-application-document.entity';
import { TenderApplicationStatusHistory } from './entities/tender-application-status-history.entity';
import { CreateTenderApplicationDto, TenderDocumentDto } from './dto/create-tender-application.dto';
import {
  UpdateTenderApplicationStatusDto,
  TenderStatusAction,
} from './dto/update-tender-application-status.dto';
import { SmsTemplates } from './sms-templates';
import { EmailTemplates } from './email-templates';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import { Announcement } from '../public/entities/announcement.entity';
import { User } from '../users/entities/user.entity';

/**
 * Statuses that count as a live bid. A withdrawn or rejected bid frees the
 * applicant to bid again on the same tender (mirrored by the partial unique
 * index in migration 035) — anything else blocks a duplicate.
 */
const ACTIVE_STATUSES: TenderApplicationStatus[] = [
  TenderApplicationStatus.SUBMITTED,
  TenderApplicationStatus.UNDER_REVIEW,
  TenderApplicationStatus.MORE_INFO_REQUESTED,
  TenderApplicationStatus.SHORTLISTED,
  TenderApplicationStatus.AWARDED,
];

/** Statuses the applicant may still edit — mirrors the frontend's EDITABLE_STATUSES. */
const EDITABLE_STATUSES: TenderApplicationStatus[] = [
  TenderApplicationStatus.SUBMITTED,
  TenderApplicationStatus.MORE_INFO_REQUESTED,
];

/** Statuses the applicant may withdraw from — once awarded, withdrawal is a contract matter, not a click. */
const WITHDRAWABLE_STATUSES: TenderApplicationStatus[] = [
  TenderApplicationStatus.SUBMITTED,
  TenderApplicationStatus.UNDER_REVIEW,
  TenderApplicationStatus.MORE_INFO_REQUESTED,
  TenderApplicationStatus.SHORTLISTED,
];

@Injectable()
export class TendersService {
  private readonly logger = new Logger(TendersService.name);

  constructor(
    @InjectRepository(TenderApplication)
    private readonly appRepo: Repository<TenderApplication>,
    @InjectRepository(TenderApplicationDocument)
    private readonly docRepo: Repository<TenderApplicationDocument>,
    @InjectRepository(TenderApplicationStatusHistory)
    private readonly historyRepo: Repository<TenderApplicationStatusHistory>,
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  // ── Tender lookup ────────────────────────────────────────────────────────────

  /**
   * Loads the tender a bid targets, and refuses one that isn't open for bidding.
   *
   * Tenders live in `announcements` (type='tender'), so the FK alone can't
   * guarantee the target is a tender at all — that check has to happen here.
   * Deadline enforcement is server-side on purpose: the board UI hides closed
   * tenders, but a stale tab or a hand-rolled POST must not slip a late bid in.
   */
  private async loadOpenTender(tenderId: string): Promise<Announcement> {
    const tender = await this.announcementRepo.findOne({ where: { id: tenderId } });
    if (!tender || tender.type !== 'tender') throw new NotFoundException('Tender not found');
    if (!tender.isPublished) throw new NotFoundException('Tender not found');

    if (tender.expiresAt && new Date(tender.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('The submission deadline for this tender has passed');
    }
    return tender;
  }

  /** EN title of a tender, for SMS/email bodies. */
  private tenderTitle(tender: Announcement): string {
    return tender.titleI18n?.en || tender.title;
  }

  // ── Secure public tracking (phone-OTP gated) ──────────────────────────────────

  /**
   * Resolve a bid's public tracking code to the OTP subject (id + phone), or null.
   *
   * Deliberately resolves the crypto-random `trackingCode`, NOT the sequential
   * `applicationNumber`: the latter is enumerable, so accepting it would let an
   * attacker guess references and trigger OTP SMS to their owners. The tracking
   * code (32^8 combinations) is not guessable, and nothing is disclosed without
   * the phone OTP either way.
   */
  async findSubjectByCode(code: string): Promise<TrackingSubject | null> {
    const value = (code || '').trim().toUpperCase();
    if (!value) return null;
    const app = await this.appRepo.findOne({
      where: { trackingCode: value },
      select: { id: true, phone: true },
    });
    return app ? { id: app.id, phone: app.phone } : null;
  }

  /** Minimal, PII-safe status view for a verified tracking session (by id). */
  async getTrackingInfo(id: string) {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    const tender = await this.announcementRepo.findOne({ where: { id: app.tenderId } });
    return {
      applicationNumber: app.applicationNumber,
      companyName: app.companyName,
      tenderTitle: tender ? this.tenderTitle(tender) : null,
      tenderTitleI18n: tender?.titleI18n ?? null,
      status: app.status,
      moreInfoRequested: app.moreInfoRequested,
      rejectionReason: app.rejectionReason,
      submittedAt: app.submittedAt,
      updatedAt: app.updatedAt,
    };
  }

  // ── Documents ────────────────────────────────────────────────────────────────

  /**
   * All three document types must be present exactly once. Enforced here rather
   * than in the DTO because class-validator can express "at most 3 items" but
   * not "one of each docType".
   */
  private assertDocumentsComplete(documents: TenderDocumentDto[]): void {
    const seen = new Set<TenderDocumentType>();
    for (const doc of documents) {
      if (seen.has(doc.docType)) {
        throw new BadRequestException(`Duplicate document supplied for "${doc.docType}"`);
      }
      seen.add(doc.docType);
    }

    const missing = REQUIRED_TENDER_DOCUMENTS.filter((type) => !seen.has(type));
    if (missing.length) {
      throw new BadRequestException(`Missing required document(s): ${missing.join(', ')}`);
    }
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(applicantId: string, dto: CreateTenderApplicationDto): Promise<TenderApplication> {
    const tender = await this.loadOpenTender(dto.tenderId);
    this.assertDocumentsComplete(dto.documents);

    const existing = await this.appRepo.findOne({
      where: {
        tenderId: dto.tenderId,
        applicantId,
        status: In(ACTIVE_STATUSES),
        deletedAt: IsNull(),
      },
    });
    if (existing) {
      throw new ConflictException(
        `You already have an active bid on this tender (${existing.applicationNumber})`,
      );
    }

    const applicationNumber = await this.generateApplicationNumber();
    const trackingCode = await this.generateUniqueTrackingCode();

    const application = this.appRepo.create({
      applicationNumber,
      trackingCode,
      tenderId: dto.tenderId,
      applicantId,
      companyName: dto.companyName,
      companyTin: dto.companyTin,
      contactName: dto.contactName,
      email: dto.email ?? null,
      phone: dto.phone,
      districtId: dto.districtId ?? null,
      sectorId: dto.sectorId ?? null,
      cell: dto.cell ?? null,
      village: dto.village ?? null,
      bidAmount: dto.bidAmount ?? null,
      coverNote: dto.coverNote ?? null,
      status: TenderApplicationStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    const saved = await this.appRepo.save(application);

    await this.docRepo.save(
      dto.documents.map((doc) =>
        this.docRepo.create({
          applicationId: saved.id,
          docType: doc.docType,
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
        }),
      ),
    );

    await this.recordStatusChange(
      saved.id,
      null,
      TenderApplicationStatus.SUBMITTED,
      applicantId,
      'Bid submitted',
    );

    this.sendSubmissionNotice(saved, this.tenderTitle(tender));

    return this.findOwn(saved.id, applicantId);
  }

  async update(
    id: string,
    applicantId: string,
    dto: Partial<CreateTenderApplicationDto>,
  ): Promise<TenderApplication> {
    const application = await this.findOwn(id, applicantId);

    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new ForbiddenException('Only a submitted or more-info-requested bid can be updated');
    }

    // A bid can only be edited while its tender is still open — the same
    // deadline rule that governs creation.
    await this.loadOpenTender(application.tenderId);

    Object.assign(application, {
      companyName: dto.companyName ?? application.companyName,
      companyTin: dto.companyTin ?? application.companyTin,
      contactName: dto.contactName ?? application.contactName,
      email: dto.email ?? application.email,
      phone: dto.phone ?? application.phone,
      districtId: dto.districtId ?? application.districtId,
      sectorId: dto.sectorId ?? application.sectorId,
      cell: dto.cell ?? application.cell,
      village: dto.village ?? application.village,
      bidAmount: dto.bidAmount ?? application.bidAmount,
      coverNote: dto.coverNote ?? application.coverNote,
    });

    // A re-submission answers whatever the reviewer asked for, so the note is
    // cleared and the bid re-enters the queue as a plain submission.
    if (application.status === TenderApplicationStatus.MORE_INFO_REQUESTED) {
      application.moreInfoRequested = null;
      application.status = TenderApplicationStatus.SUBMITTED;
      await this.recordStatusChange(
        application.id,
        TenderApplicationStatus.MORE_INFO_REQUESTED,
        TenderApplicationStatus.SUBMITTED,
        applicantId,
        'Bid updated and re-submitted by applicant',
      );
    }

    await this.saveScalarFields(application);

    // Documents are replaced wholesale when supplied — a partial set would leave
    // the bid with a stale mix of old and new files.
    if (dto.documents?.length) {
      this.assertDocumentsComplete(dto.documents);
      await this.docRepo.delete({ applicationId: application.id });
      await this.docRepo.save(
        dto.documents.map((doc) =>
          this.docRepo.create({
            applicationId: application.id,
            docType: doc.docType,
            fileKey: doc.fileKey,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
          }),
        ),
      );
    }

    return this.findOwn(id, applicantId);
  }

  async withdraw(id: string, applicantId: string): Promise<TenderApplication> {
    const application = await this.findOwn(id, applicantId);
    if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
      throw new ForbiddenException(`A ${application.status} bid cannot be withdrawn`);
    }

    const prev = application.status;
    application.status = TenderApplicationStatus.WITHDRAWN;
    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      TenderApplicationStatus.WITHDRAWN,
      applicantId,
      'Withdrawn by applicant',
    );
    return application;
  }

  // ── Queries (applicant) ──────────────────────────────────────────────────────

  async findOwn(id: string, applicantId: string): Promise<TenderApplication> {
    const application = await this.appRepo.findOne({
      where: { id },
      relations: ['documents', 'statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.applicantId !== applicantId) throw new ForbiddenException('Access denied');
    return this.withTender(application);
  }

  async listOwn(applicantId: string): Promise<TenderApplication[]> {
    const applications = await this.appRepo.find({
      where: { applicantId },
      relations: ['documents', 'statusHistory'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(applications.map((a) => this.withTender(a)));
  }

  /**
   * Attaches the tender's title/deadline to an application for display. The FK
   * points at `announcements`, which TypeORM can't eagerly join here without
   * modelling a relation onto a table this module doesn't own — a single lookup
   * keeps the coupling one-directional.
   */
  private async withTender(application: TenderApplication): Promise<TenderApplication> {
    const tender = await this.announcementRepo.findOne({
      where: { id: application.tenderId },
    });
    (application as TenderApplication & { tender?: unknown }).tender = tender
      ? {
          id: tender.id,
          title: tender.title,
          titleI18n: tender.titleI18n,
          expiresAt: tender.expiresAt,
        }
      : null;
    return application;
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(filters: {
    status?: string;
    tenderId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, tenderId, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.documents', 'documents')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('app.status = :status', { status });
    if (tenderId) qb.andWhere('app.tenderId = :tenderId', { tenderId });
    if (dateFrom) qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1); // inclusive end date
      qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (search) {
      qb.andWhere(
        '(app.companyName ILIKE :q OR app.applicationNumber ILIKE :q OR app.companyTin ILIKE :q OR app.phone ILIKE :q)',
        { q: `%${search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    const withTenders = await Promise.all(items.map((a) => this.withTender(a)));
    return { items: withTenders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGetById(id: string): Promise<TenderApplication> {
    const application = await this.appRepo.findOne({
      where: { id },
      relations: ['documents', 'statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');

    const applicant = await this.userRepo.findOne({ where: { id: application.applicantId } });
    if (applicant) {
      (application as TenderApplication & { applicant?: unknown }).applicant = {
        id: applicant.id,
        name: [applicant.firstName, applicant.lastName].filter(Boolean).join(' '),
        email: applicant.email,
        phone: applicant.phone,
      };
    }

    return this.withTender(application);
  }

  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateTenderApplicationStatusDto,
  ): Promise<TenderApplication> {
    const application = await this.adminGetById(id);
    const prev = application.status;

    if (prev === TenderApplicationStatus.WITHDRAWN || prev === TenderApplicationStatus.REJECTED) {
      throw new BadRequestException(`A ${prev} bid can no longer be actioned`);
    }

    let toStatus: TenderApplicationStatus;
    switch (dto.action) {
      case TenderStatusAction.START_REVIEW:
        toStatus = TenderApplicationStatus.UNDER_REVIEW;
        break;

      case TenderStatusAction.REQUEST_MORE_INFO:
        if (!dto.notes?.trim()) {
          throw new BadRequestException('Notes are required when requesting more info');
        }
        application.moreInfoRequested = dto.notes;
        toStatus = TenderApplicationStatus.MORE_INFO_REQUESTED;
        break;

      case TenderStatusAction.SHORTLIST:
        toStatus = TenderApplicationStatus.SHORTLISTED;
        break;

      case TenderStatusAction.AWARD:
        // Awarding straight from `submitted` would skip evaluation entirely, so
        // a bid must be shortlisted first — the one ordering rule in this flow.
        if (prev !== TenderApplicationStatus.SHORTLISTED) {
          throw new BadRequestException('Only a shortlisted bid can be awarded');
        }
        toStatus = TenderApplicationStatus.AWARDED;
        break;

      case TenderStatusAction.REJECT:
        if (!dto.reason?.trim()) {
          throw new BadRequestException('A rejection reason is required');
        }
        application.rejectionReason = dto.reason;
        toStatus = TenderApplicationStatus.REJECTED;
        break;

      default:
        throw new BadRequestException('Unsupported action');
    }

    application.status = toStatus;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    if (dto.notes) application.reviewNotes = dto.notes;

    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      toStatus,
      adminId,
      dto.notes ?? dto.reason ?? null,
    );

    const tender = await this.announcementRepo.findOne({ where: { id: application.tenderId } });
    const title = tender ? this.tenderTitle(tender) : 'RMC tender';

    switch (toStatus) {
      case TenderApplicationStatus.UNDER_REVIEW:
        this.notify(application, 'tender.under_review', {
          sms: SmsTemplates.underReview(application.applicationNumber),
          email: EmailTemplates.underReview(
            application.companyName,
            application.applicationNumber,
            title,
          ),
        });
        break;
      case TenderApplicationStatus.MORE_INFO_REQUESTED:
        this.notify(application, 'tender.more_info_requested', {
          sms: SmsTemplates.moreInfoRequested(
            application.applicationNumber,
            application.moreInfoRequested,
          ),
          email: EmailTemplates.moreInfoRequested(
            application.companyName,
            application.applicationNumber,
            title,
            application.moreInfoRequested,
          ),
        });
        break;
      case TenderApplicationStatus.SHORTLISTED:
        this.notify(application, 'tender.shortlisted', {
          sms: SmsTemplates.shortlisted(application.applicationNumber),
          email: EmailTemplates.shortlisted(
            application.companyName,
            application.applicationNumber,
            title,
          ),
        });
        break;
      case TenderApplicationStatus.AWARDED:
        this.notify(application, 'tender.awarded', {
          sms: SmsTemplates.awarded(application.applicationNumber),
          email: EmailTemplates.awarded(
            application.companyName,
            application.applicationNumber,
            title,
          ),
        });
        break;
      case TenderApplicationStatus.REJECTED:
        this.notify(application, 'tender.rejected', {
          sms: SmsTemplates.rejected(application.applicationNumber, application.rejectionReason),
          email: EmailTemplates.rejected(
            application.companyName,
            application.applicationNumber,
            title,
            application.rejectionReason,
          ),
        });
        break;
    }

    return application;
  }

  /** Marks one uploaded document as checked by an evaluator. */
  async adminVerifyDocument(
    applicationId: string,
    documentId: string,
    adminId: string,
    verified: boolean,
  ): Promise<TenderApplicationDocument> {
    const doc = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!doc) throw new NotFoundException('Document not found on this application');

    doc.verified = verified;
    doc.verifiedBy = verified ? adminId : null;
    doc.verifiedAt = verified ? new Date() : null;
    return this.docRepo.save(doc);
  }

  async adminGetReports(filters: { dateFrom?: string; dateTo?: string } = {}) {
    const qb = this.appRepo.createQueryBuilder('app');
    if (filters.dateFrom) qb.andWhere('app.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setDate(end.getDate() + 1);
      qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
    }

    const total = await qb.getCount();

    const byStatus = await qb
      .clone()
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany();

    const bidValue = await qb
      .clone()
      .select('SUM(app.bidAmount)', 'total')
      .andWhere('app.status = :s', { s: TenderApplicationStatus.AWARDED })
      .getRawOne();

    return { total, byStatus, awardedValue: Number(bidValue?.total ?? 0) };
  }

  /** CSV export of applications matching the given filters (no pagination). */
  async adminExportCsv(filters: {
    status?: string;
    tenderId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string> {
    const { items } = await this.adminList({
      ...filters,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });

    const header = [
      'applicationNumber',
      'companyName',
      'companyTin',
      'contactName',
      'phone',
      'email',
      'bidAmount',
      'status',
      'documentsUploaded',
      'submittedAt',
    ];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((a) =>
      [
        a.applicationNumber,
        a.companyName,
        a.companyTin,
        a.contactName,
        a.phone,
        a.email,
        a.bidAmount,
        a.status,
        a.documents?.length ?? 0,
        a.submittedAt?.toISOString(),
      ]
        .map(escape)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /** RMC-TND-<YYYYMM>-<5-digit-seq>. Allocated server-side, never by the client. */
  private async generateApplicationNumber(): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('tender_application_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `RMC-TND-${year}${month}-${seq}`;
  }

  /** Crypto-random public tracking code, retried on the (rare) collision. */
  private async generateUniqueTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateTrackingCode('RMC-TND');
      const clash = await this.appRepo.count({ where: { trackingCode: code } });
      if (clash === 0) return code;
    }
    throw new Error('Could not generate a unique tracking code');
  }

  /**
   * Persists scalar column changes via a targeted `.update()` rather than
   * `.save()` on the loaded entity.
   *
   * Entities here are always loaded WITH their `documents`/`statusHistory`
   * relations (findOwn/adminGetById need them for the API payload). Re-saving
   * such an entity makes TypeORM diff the in-memory relation array against the
   * DB and null out the FK of any child row missing from it — which silently
   * orphans a document or history row written moments earlier through its own
   * repo. This bit the Good Conduct service in production; `.update()` never
   * touches relations, so it can't happen. Same fix, same reason.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars -- relation + hydrated fields deliberately dropped, see above */
  private async saveScalarFields(application: TenderApplication): Promise<void> {
    const { documents, statusHistory, ...rest } = application as TenderApplication & {
      applicant?: unknown;
      tender?: unknown;
    };
    const {
      applicant: _applicant,
      tender: _tender,
      id,
      ...columns
    } = rest as Record<string, unknown>;
    await this.appRepo.update(id as string, columns);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  private async recordStatusChange(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<TenderApplicationStatusHistory> {
    const history = this.historyRepo.create({
      applicationId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.historyRepo.save(history);
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  /**
   * Fire-and-forget SMS + email for one event, each gated by its own toggle in
   * /admin/settings. Never throws and never awaits: a dead SMS gateway must not
   * fail the status change that triggered it.
   */
  private notify(
    application: TenderApplication,
    eventKey: string,
    templates: { sms: string; email: { subject: string; html: string } },
  ): void {
    if (this.notifSettings.isSmsEnabled(eventKey) && application.phone) {
      void this.smsService.sendSms(application.phone, templates.sms);
    }

    if (this.notifSettings.isEmailEnabled(eventKey) && application.email) {
      this.emailService
        .sendEmail({
          to: application.email,
          subject: templates.email.subject,
          html: templates.email.html,
        })
        .catch((err) => {
          this.logger.warn(`Tender email to ${application.email} failed: ${err}`);
        });
    }
  }

  private sendSubmissionNotice(application: TenderApplication, tenderTitle: string): void {
    this.notify(application, 'tender.submission', {
      sms: SmsTemplates.submission(
        application.applicationNumber,
        application.trackingCode,
        tenderTitle,
      ),
      email: EmailTemplates.submission(
        application.companyName,
        application.applicationNumber,
        application.trackingCode,
        tenderTitle,
      ),
    });
  }
}
