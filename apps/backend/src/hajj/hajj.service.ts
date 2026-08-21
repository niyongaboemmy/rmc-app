import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { toXlsxBuffer, formatDateTime } from '../common/utils/xlsx';
import { generateTrackingCode } from '../tracking/tracking-code.util';
import type { TrackingSubject } from '../tracking/tracking-verification.service';

import {
  HajjApplication,
  HajjApplicationStatus,
  HAJJ_FINAL_STATUSES,
} from './entities/hajj-application.entity';
import { HajjStatusHistory } from './entities/hajj-status-history.entity';
import {
  HajjDocument,
  HajjDocumentType,
  REQUIRED_HAJJ_DOCUMENTS,
} from './entities/hajj-document.entity';
import { CreateHajjApplicationDto } from './dto/create-hajj-application.dto';
import { UpdateHajjStatusDto } from './dto/update-hajj-status.dto';
import {
  ResubmitHajjDocumentsDto,
  ResubmitHajjDocumentItemDto,
} from './dto/resubmit-hajj-document.dto';
import { QueryHajjApplicationsDto } from './dto/query-hajj-applications.dto';
import { PublicUploadService } from '../integrations/storage/public-upload.service';
import { HajjSmsTemplates } from './hajj-sms-templates';
import { HajjEmailTemplates } from './hajj-email-templates';

import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import { wrapEmailHtml } from '../integrations/email/email-template';

/** Event keys registered in notification_settings (see the Hajj migration). */
const EVENT = {
  SUBMISSION: 'hajj.submission',
  STATUS_CHANGE: 'hajj.status_change',
} as const;

/** What the admin list is filtered by — and therefore what an export covers. */
export interface HajjApplicationFilters {
  status?: HajjApplicationStatus;
  search?: string;
}

/**
 * Mirrors HAJJ_STATUS_LABELS on the frontend: a report that says "Rejected" where
 * the screen says "Not Approved" would read as a different decision.
 */
const HAJJ_STATUS_LABELS: Record<HajjApplicationStatus, string> = {
  [HajjApplicationStatus.SUBMITTED]: 'Submitted',
  [HajjApplicationStatus.UNDER_REVIEW]: 'Under Review',
  [HajjApplicationStatus.MORE_INFO_REQUESTED]: 'More Information Requested',
  [HajjApplicationStatus.APPROVED]: 'Approved',
  [HajjApplicationStatus.REJECTED]: 'Not Approved',
};

/** Keys of the exported rows, in column order. */
const HAJJ_EXPORT_COLUMNS = [
  'Application Number',
  'Full Name',
  'Phone',
  'Email',
  'District',
  'Sector',
  'Passport Number',
  'Status',
  'Registration Fee Receipt',
  'Advance Payment Receipt',
  'Submitted At',
  'Reviewed At',
  'Reviewed By',
  'Review Notes',
  'Rejection Reason',
];

@Injectable()
export class HajjService {
  private readonly logger = new Logger(HajjService.name);

  constructor(
    @InjectRepository(HajjApplication)
    private readonly applications: Repository<HajjApplication>,
    @InjectRepository(HajjStatusHistory)
    private readonly history: Repository<HajjStatusHistory>,
    @InjectRepository(HajjDocument)
    private readonly documents: Repository<HajjDocument>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifSettings: NotificationSettingsService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly storage: PublicUploadService,
  ) {}

  private get appUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'https://isengesho.com';
  }

  // ── Public ────────────────────────────────────────────────────────────────

  /** Submit a new application. Notifies the applicant that we received it. */
  async apply(dto: CreateHajjApplicationDto): Promise<HajjApplication> {
    // Exactly one receipt of each type — otherwise an applicant could submit the
    // same proof twice and leave a payment unevidenced.
    const types = dto.documents.map((d) => d.documentType);
    for (const required of REQUIRED_HAJJ_DOCUMENTS) {
      if (types.filter((t) => t === required).length !== 1) {
        throw new BadRequestException(`Exactly one "${required}" receipt is required.`);
      }
    }

    const applicationNumber = await this.generateApplicationNumber();
    const trackingCode = await this.generateUniqueTrackingCode();
    const { documents, ...fields } = dto;

    const app = this.applications.create({
      ...fields,
      email: dto.email?.trim() || null,
      phone: normalizeRwPhone(dto.phone),
      applicationNumber,
      trackingCode,
      status: HajjApplicationStatus.SUBMITTED,
      documents: documents.map((d) => this.documents.create(d)),
    });

    const saved = await this.applications.save(app);
    await this.recordStatusChange(saved.id, null, saved.status, null, 'Application submitted');
    await this.notifySubmission(saved);
    return saved;
  }

  /** Applicant status lookup — the application number is the public credential. */
  async findByNumber(applicationNumber: string): Promise<HajjApplication> {
    const app = await this.applications.findOne({
      where: { applicationNumber: applicationNumber.trim().toUpperCase() },
    });
    if (!app) throw new NotFoundException('No Hajj application found with that number');
    return app;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /**
   * The status/search filter, shared by the list and the export so a downloaded
   * report always covers exactly the rows the admin is looking at.
   */
  private adminFilteredQuery(filters: HajjApplicationFilters) {
    const qb = this.applications.createQueryBuilder('a');
    if (filters.status) qb.andWhere('a.status = :status', { status: filters.status });
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(a.application_number) LIKE :term', { term })
            .orWhere('LOWER(a.full_name) LIKE :term', { term })
            .orWhere('a.phone LIKE :term', { term })
            .orWhere('LOWER(a.passport_number) LIKE :term', { term });
        }),
      );
    }
    return qb.orderBy('a.created_at', 'DESC');
  }

  async adminFindAll(query: QueryHajjApplicationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.adminFilteredQuery(query)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * Every application matching the current filter as an .xlsx report — deliberately
   * unpaginated, since the point of the export is the whole set, not the page the
   * admin happens to be on. The receipts are joined in: whether each proof was
   * actually verified is the part of an application's state a status column alone
   * can't tell you.
   */
  async adminExportXlsx(filters: HajjApplicationFilters): Promise<Buffer> {
    const applications = await this.adminFilteredQuery(filters)
      .leftJoinAndSelect('a.documents', 'd')
      .getMany();

    const reviewers = await this.reviewerNames(applications);

    const rows = applications.map((app) => {
      // A category can hold several uploads (the applicant re-sent a correction);
      // the report reflects the latest one.
      const receipt = (type: HajjDocumentType) =>
        app.documents
          ?.filter((d) => d.documentType === type)
          .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

      return {
        'Application Number': app.applicationNumber,
        'Full Name': app.fullName,
        Phone: app.phone,
        Email: app.email ?? '',
        District: app.district,
        Sector: app.sector,
        'Passport Number': app.passportNumber,
        Status: HAJJ_STATUS_LABELS[app.status] ?? app.status,
        'Registration Fee Receipt': receiptState(receipt(HajjDocumentType.REGISTRATION_FEE)),
        'Advance Payment Receipt': receiptState(receipt(HajjDocumentType.ADVANCE_PAYMENT)),
        'Submitted At': formatDateTime(app.createdAt),
        'Reviewed At': formatDateTime(app.reviewedAt),
        'Reviewed By': app.reviewedBy ? (reviewers.get(app.reviewedBy) ?? '') : '',
        'Review Notes': app.reviewNotes ?? '',
        'Rejection Reason': app.rejectionReason ?? '',
      };
    });

    return toXlsxBuffer('Hajj Applications', HAJJ_EXPORT_COLUMNS, rows);
  }

  /** uuid → "First Last", so the report names the reviewer instead of showing an id. */
  private async reviewerNames(apps: HajjApplication[]): Promise<Map<string, string>> {
    const ids = [...new Set(apps.map((a) => a.reviewedBy).filter((id): id is string => !!id))];
    if (!ids.length) return new Map();

    const rows: { id: string; first_name: string; last_name: string }[] =
      await this.dataSource.query(
        `SELECT id, first_name, last_name FROM users WHERE id = ANY($1)`,
        [ids],
      );
    return new Map(rows.map((r) => [r.id, `${r.first_name} ${r.last_name}`.trim()]));
  }

  /** Includes the uploaded receipts — this is what the admin opens and inspects. */
  async adminFindOne(id: string): Promise<HajjApplication> {
    const app = await this.applications.findOne({
      where: { id },
      relations: { documents: true },
    });
    if (!app) throw new NotFoundException('Hajj application not found');
    return app;
  }

  /** Load a receipt's bytes so the admin can inspect the real file. */
  async adminGetDocumentFile(
    documentId: string,
  ): Promise<{ document: HajjDocument; buffer: Buffer; mimeType: string }> {
    const document = await this.documents.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');

    const { buffer, mimeType } = await this.storage.fetch(document.fileKey);
    return { document, buffer, mimeType };
  }

  /** Tick a receipt off once the admin has actually opened and checked it. */
  async adminVerifyDocument(
    documentId: string,
    adminId: string,
    verified: boolean,
  ): Promise<HajjDocument> {
    const doc = await this.documents.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    doc.verified = verified;
    doc.verifiedBy = verified ? adminId : null;
    doc.verifiedAt = verified ? new Date() : null;
    return this.documents.save(doc);
  }

  async adminGetHistory(id: string): Promise<HajjStatusHistory[]> {
    await this.adminFindOne(id);
    return this.history.find({
      where: { applicationId: id },
      order: { changedAt: 'ASC' },
    });
  }

  /** Counts for the admin dashboard cards. */
  async adminStats() {
    const rows: { status: HajjApplicationStatus; count: string }[] = await this.applications
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    const byStatus = Object.fromEntries(
      Object.values(HajjApplicationStatus).map((s) => [s, 0]),
    ) as Record<HajjApplicationStatus, number>;
    let total = 0;
    for (const r of rows) {
      const n = Number(r.count);
      byStatus[r.status] = n;
      total += n;
    }
    return { total, byStatus };
  }

  /**
   * Verify → approve / reject. The applicant is notified on every transition, so
   * a final decision can never land without them having heard about the review.
   */
  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateHajjStatusDto,
  ): Promise<HajjApplication> {
    const app = await this.adminFindOne(id);
    const previous = app.status;

    if (previous === dto.status) {
      throw new BadRequestException(`Application is already ${previous}`);
    }
    // A decision is final: re-deciding would send the applicant a contradicting
    // message after they have already been told the outcome.
    if (HAJJ_FINAL_STATUSES.includes(previous)) {
      throw new BadRequestException(
        `Application ${app.applicationNumber} is already ${previous} and cannot be changed`,
      );
    }

    app.status = dto.status;
    app.reviewedBy = adminId;
    app.reviewedAt = new Date();
    if (dto.notes) app.reviewNotes = dto.notes;
    if (dto.status === HajjApplicationStatus.REJECTED) {
      app.rejectionReason = dto.rejectionReason ?? null;
    }
    // Carry the request only while it is outstanding: moving to any other status
    // means the admin is no longer waiting, so the applicant must stop being told
    // that something is missing.
    app.moreInfoRequested =
      dto.status === HajjApplicationStatus.MORE_INFO_REQUESTED
        ? (dto.moreInfoRequested ?? null)
        : null;
    // The requested slots travel with the ask and are cleared the same moment.
    app.moreInfoDocumentTypes =
      dto.status === HajjApplicationStatus.MORE_INFO_REQUESTED
        ? (dto.moreInfoDocumentTypes ?? null)
        : null;

    const saved = await this.applications.save(app);
    await this.recordStatusChange(saved.id, previous, saved.status, adminId, dto.notes ?? null);
    await this.notifyStatusChange(saved);
    return saved;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * RMC-HAJ-YYYYMM-NNNNN, drawn from a Postgres sequence so concurrent submissions
   * can't collide (mirrors the marriage application number).
   */
  private async generateApplicationNumber(): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('hajj_application_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `RMC-HAJ-${year}${month}-${seq}`;
  }

  /** Crypto-random public tracking code, retried on the (rare) collision. */
  private async generateUniqueTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateTrackingCode('RMC-HAJ');
      const clash = await this.applications.count({ where: { trackingCode: code } });
      if (clash === 0) return code;
    }
    throw new Error('Could not generate a unique tracking code');
  }

  // ── Secure tracking (phone-OTP gated) ────────────────────────────────────────

  /** Resolve a public tracking code to the OTP subject (id + phone), or null. */
  /**
   * Resolve what the applicant typed into the application to verify against.
   *
   * Accepts EITHER identifier, because an applicant holds both and the two look
   * confusingly alike:
   *   • applicationNumber — RMC-HAJ-202607-00001 (what the screens show them)
   *   • trackingCode      — RMC-HAJ-2607-XXXXXXXX (older confirmation emails)
   *
   * Note the trade-off: applicationNumber is sequential, so this makes the
   * lookup enumerable in a way the random trackingCode was not. Nothing is
   * disclosed without the phone OTP, and both the per-IP (15) and
   * per-application (3) limits still apply per 10-minute window — but it does
   * mean a guessed number can trigger an SMS to its owner.
   */
  async findSubjectByCode(code: string): Promise<TrackingSubject | null> {
    const value = (code || '').trim().toUpperCase();
    if (!value) return null;
    const app = await this.applications.findOne({
      // An array is an OR in TypeORM. Both columns are unique, so at most one row.
      where: [{ applicationNumber: value }, { trackingCode: value }],
      select: { id: true, phone: true },
    });
    return app ? { id: app.id, phone: app.phone } : null;
  }

  /** Minimal, safe status view for a verified tracking session (by id). */
  async getTrackingInfo(id: string) {
    const app = await this.applications.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    return {
      trackingCode: app.trackingCode,
      fullName: app.fullName,
      district: app.district,
      sector: app.sector,
      status: app.status,
      rejectionReason: app.rejectionReason,
      /** Drives the upload panel on the tracking page. */
      moreInfoRequested: app.moreInfoRequested,
      /** Which upload slots that panel shows (null = both, for legacy rows). */
      moreInfoDocumentTypes: app.moreInfoDocumentTypes,
      submittedAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  /**
   * The applicant's answer to a "more information requested": attach the file(s)
   * they just uploaded and hand the application back to the reviewers.
   *
   * Every requested document is attached in ONE call and the application returns
   * to review only once, after all of them are in — so an admin who asked for
   * both receipts doesn't lock the applicant out the moment they upload the
   * first. Guarded by the OTP tracking token (the caller resolves it to `id`),
   * and only legal while the request is actually outstanding — otherwise anyone
   * holding a live token could keep mutating a decided application.
   */
  async resubmitDocuments(
    id: string,
    dto: ResubmitHajjDocumentsDto,
  ): Promise<{ status: HajjApplicationStatus; documentTypes: HajjDocumentType[] }> {
    const app = await this.applications.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    if (app.status !== HajjApplicationStatus.MORE_INFO_REQUESTED) {
      // A distinct code so the tracking page can say "already answered — refresh"
      // rather than a generic upload failure.
      throw new BadRequestException({
        code: 'HAJJ_NOT_AWAITING_DOCS',
        message: 'This application is not awaiting additional documents',
      });
    }

    // When the admin named the receipts they need, hold the applicant to exactly
    // that set: they may not overwrite an unrequested (possibly already-verified)
    // receipt, and the application does not return to review until every
    // requested one is in. A null list is a legacy ask — accept either receipt.
    const requested = app.moreInfoDocumentTypes;
    if (requested?.length) {
      const unexpected = dto.documents.find((d) => !requested.includes(d.documentType));
      if (unexpected) {
        throw new BadRequestException({
          code: 'HAJJ_DOC_NOT_REQUESTED',
          message: `The ${unexpected.documentType} receipt was not requested.`,
        });
      }
      const submitted = new Set(dto.documents.map((d) => d.documentType));
      const missing = requested.filter((r) => !submitted.has(r));
      if (missing.length) {
        throw new BadRequestException({
          code: 'HAJJ_DOCS_INCOMPLETE',
          message: `Still awaiting: ${missing.join(', ')}.`,
        });
      }
    }

    // Attach each in turn; a later item for the same type just re-replaces the
    // slot, so a duplicate in one batch is harmless (last one wins).
    for (const item of dto.documents) {
      await this.attachDocument(id, item);
    }

    const previous = app.status;
    app.status = HajjApplicationStatus.UNDER_REVIEW;
    app.moreInfoRequested = null; // the ask has been answered
    app.moreInfoDocumentTypes = null;
    const saved = await this.applications.save(app);

    const documentTypes = dto.documents.map((d) => d.documentType);
    await this.recordStatusChange(
      saved.id,
      previous,
      saved.status,
      null, // the applicant, not an admin
      `Applicant re-uploaded ${documentTypes.join(', ')}`,
    );

    return { status: saved.status, documentTypes };
  }

  /**
   * Attach one re-uploaded receipt as a NEW document under its category, keeping
   * any earlier upload of the same type rather than overwriting it — the reviewer
   * can compare the original against the correction, and a previously verified
   * receipt is never silently discarded. A fresh file is unverified until an
   * admin opens it.
   */
  private async attachDocument(
    applicationId: string,
    item: ResubmitHajjDocumentItemDto,
  ): Promise<void> {
    await this.documents.save(
      this.documents.create({
        applicationId,
        documentType: item.documentType,
        fileKey: item.fileKey,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        verified: false,
      }),
    );
  }

  private async recordStatusChange(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<void> {
    await this.history.save(
      this.history.create({ applicationId, fromStatus, toStatus, changedBy, notes }),
    );
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  private async notifySubmission(app: HajjApplication): Promise<void> {
    if (this.notifSettings.isSmsEnabled(EVENT.SUBMISSION)) {
      this.dispatchSms(app.phone, HajjSmsTemplates.submission(app.trackingCode));
    }
    if (this.notifSettings.isEmailEnabled(EVENT.SUBMISSION)) {
      await this.dispatchEmail(app, HajjEmailTemplates.submission(app));
    }
  }

  private async notifyStatusChange(app: HajjApplication): Promise<void> {
    const sms = this.buildStatusSms(app);
    if (sms && this.notifSettings.isSmsEnabled(EVENT.STATUS_CHANGE)) {
      this.dispatchSms(app.phone, sms);
    }
    const mail = this.buildStatusEmail(app);
    if (mail && this.notifSettings.isEmailEnabled(EVENT.STATUS_CHANGE)) {
      await this.dispatchEmail(app, mail);
    }
  }

  private buildStatusSms(app: HajjApplication): string | null {
    switch (app.status) {
      case HajjApplicationStatus.UNDER_REVIEW:
        return HajjSmsTemplates.underReview(app.trackingCode);
      case HajjApplicationStatus.APPROVED:
        return HajjSmsTemplates.approved(app.trackingCode);
      case HajjApplicationStatus.MORE_INFO_REQUESTED:
        return HajjSmsTemplates.moreInfoRequested(app.trackingCode, app.moreInfoRequested);
      case HajjApplicationStatus.REJECTED:
        return HajjSmsTemplates.rejected(app.trackingCode, app.rejectionReason);
      default:
        return null;
    }
  }

  private buildStatusEmail(app: HajjApplication): { subject: string; html: string } | null {
    switch (app.status) {
      case HajjApplicationStatus.UNDER_REVIEW:
        return HajjEmailTemplates.underReview(app);
      case HajjApplicationStatus.APPROVED:
        return HajjEmailTemplates.approved(app);
      case HajjApplicationStatus.MORE_INFO_REQUESTED:
        return HajjEmailTemplates.moreInfoRequested(app);
      case HajjApplicationStatus.REJECTED:
        return HajjEmailTemplates.rejected(app);
      default:
        return null;
    }
  }

  /** Fire-and-forget: a dead SMS gateway must never fail the admin's decision. */
  private dispatchSms(to: string, message: string): void {
    if (!to) {
      this.logger.warn('Hajj SMS skipped: no recipient phone number');
      return;
    }
    void this.sms.sendSms(to, message);
  }

  /**
   * Email is best-effort and only when the applicant gave an address (the field is
   * optional on the public form). Failures are logged, never thrown — the status
   * change is already committed and SMS is the guaranteed channel.
   */
  private async dispatchEmail(
    app: HajjApplication,
    mail: { subject: string; html: string },
  ): Promise<void> {
    if (!app.email) return;
    try {
      await this.email.sendEmail({
        to: app.email,
        subject: mail.subject,
        html: wrapEmailHtml(mail.html, { appUrl: this.appUrl }),
      });
    } catch (err) {
      this.logger.error(
        `Hajj email to ${app.email} for ${app.applicationNumber} failed: ${(err as Error).message}`,
      );
    }
  }
}

/**
 * "Verified" / "Uploaded" / "Missing" — an uploaded receipt nobody has checked is
 * not the same as a checked one, and the report is used to chase exactly that gap.
 */
function receiptState(doc: HajjDocument | undefined): string {
  if (!doc) return 'Missing';
  return doc.verified ? 'Verified' : 'Uploaded';
}

/** 07XXXXXXXX — the form accepts +250/250 prefixes, the SMS gateway wants local. */
function normalizeRwPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('250')) return `0${digits.slice(3)}`;
  return digits;
}
