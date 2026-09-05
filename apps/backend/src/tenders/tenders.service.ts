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
import { UpdateTenderApplicationDto } from './dto/update-tender-application.dto';
import {
  UpdateTenderApplicationStatusDto,
  TenderStatusAction,
} from './dto/update-tender-application-status.dto';
import { PublicUploadService } from '../integrations/storage/public-upload.service';
import {
  TENDER_MORE_INFO_FIELDS,
  columnsForFields,
  type TenderMoreInfoField,
} from './more-info-targets';
import { SmsTemplates } from './sms-templates';
import { EmailTemplates } from './email-templates';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import { Announcement } from '../public/entities/announcement.entity';
import { User } from '../users/entities/user.entity';
import { toCsv } from '../common/csv.util';

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
    private readonly storage: PublicUploadService,
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
    const tender = await this.loadTender(tenderId);
    this.assertTenderOpen(tender);
    return tender;
  }

  /** Existence and type only — no deadline check. */
  private async loadTender(tenderId: string): Promise<Announcement> {
    const tender = await this.announcementRepo.findOne({ where: { id: tenderId } });
    if (!tender || tender.type !== 'tender') throw new NotFoundException('Tender not found');
    if (!tender.isPublished) throw new NotFoundException('Tender not found');
    return tender;
  }

  private assertTenderOpen(tender: Announcement): void {
    if (tender.expiresAt && new Date(tender.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('The submission deadline for this tender has passed');
    }
  }

  /**
   * Whether the deadline still applies to this bidder.
   *
   * It governs NEW bids and voluntary revisions. It must not govern answering a
   * reviewer's explicit "more information" request: RMC chooses when to ask, and
   * an ask issued near the deadline would otherwise strand the bid — the bidder
   * locked out of the correction, the reviewer never receiving what they asked
   * for, and the bid sitting in more_info_requested until it was cleaned up by
   * hand. Same reasoning that makes withdrawal deadline-independent.
   */
  private isAnsweringRequest(application: TenderApplication): boolean {
    return application.status === TenderApplicationStatus.MORE_INFO_REQUESTED;
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

  /**
   * The bidder's own full bid, for a verified OTP tracking session.
   *
   * Fuller than `getTrackingInfo` — every field they typed, plus their
   * attachments — because the OTP proved control of the phone on the bid, so the
   * reader IS the bidder. It is still not `findOwn`: nothing internal leaks —
   * reviewer ids, review notes, per-document verification flags.
   *
   * `fileKey` IS included. It grants nothing on its own now that
   * `tender-applications/` is a protected prefix (the file server refuses the key
   * to a browser), and the edit form needs it to echo back the documents the
   * bidder did not replace — an update sends the document set wholesale.
   *
   * `editable` is computed here rather than re-derived in the UI, so the form and
   * the endpoint can never disagree about whether an edit is allowed.
   */
  async getTrackingBid(id: string) {
    const app = await this.appRepo.findOne({ where: { id }, relations: ['documents'] });
    if (!app) throw new NotFoundException('Application not found');

    const tender = await this.announcementRepo.findOne({ where: { id: app.tenderId } });
    const deadline = tender?.expiresAt ?? null;
    const tenderOpen = !deadline || new Date(deadline) >= new Date();
    // A reviewer's outstanding request outranks the deadline — see
    // isAnsweringRequest. Without this, an ask issued near the closing date would
    // present the bidder a locked form and no way to supply what was asked for.
    const editable =
      EDITABLE_STATUSES.includes(app.status) && (tenderOpen || this.isAnsweringRequest(app));
    const scope = this.editScope(app);

    return {
      applicationNumber: app.applicationNumber,
      trackingCode: app.trackingCode,
      status: app.status,
      // The tender is open AND the bid is at a stage the bidder may still change.
      // Both halves are re-checked server-side on the update itself.
      editable,
      // Withdrawal deliberately does NOT depend on the tender still being open —
      // pulling out after the deadline is exactly when a bidder needs to, and the
      // rule is purely about how far evaluation has gone.
      withdrawable: WITHDRAWABLE_STATUSES.includes(app.status),
      tenderId: app.tenderId,
      tenderTitle: tender ? this.tenderTitle(tender) : null,
      tenderTitleI18n: tender?.titleI18n ?? null,
      tenderSlug: tender?.slug ?? null,
      tenderDeadline: deadline,
      companyName: app.companyName,
      companyTin: app.companyTin,
      contactName: app.contactName,
      email: app.email,
      phone: app.phone,
      districtId: app.districtId,
      sectorId: app.sectorId,
      cell: app.cell,
      village: app.village,
      bidAmount: app.bidAmount,
      coverNote: app.coverNote,
      moreInfoRequested: app.moreInfoRequested,
      // What the reviewer named, verbatim — drives the "here's what to fix"
      // checklist on the bid page.
      moreInfoFields: app.moreInfoFields ?? [],
      moreInfoDocumentTypes: app.moreInfoDocumentTypes ?? [],
      // …and what that actually unlocks, resolved through the same editScope the
      // update enforces. The form disables everything outside this, so the UI and
      // the endpoint cannot drift into offering an edit that would be rejected.
      editableFields: editable ? [...scope.fieldGroups] : [],
      editableDocuments: editable ? [...scope.documents] : [],
      rejectionReason: app.rejectionReason,
      submittedAt: app.submittedAt,
      updatedAt: app.updatedAt,
      documents: (app.documents ?? []).map((doc) => ({
        id: doc.id,
        docType: doc.docType,
        fileKey: doc.fileKey,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: Number(doc.fileSize),
        uploadedAt: doc.uploadedAt,
      })),
    };
  }

  /**
   * Edit a bid from a verified OTP tracking session — no login involved.
   *
   * `id` comes from the tracking token, which is only minted after the SMS OTP
   * succeeded, so ownership is already established and there is no applicantId to
   * check against. Everything else (editable status, tender still open, complete
   * document set) is the same rule set the signed-in path runs.
   */
  async updateViaTracking(id: string, dto: UpdateTenderApplicationDto) {
    const application = await this.appRepo.findOne({ where: { id } });
    if (!application) throw new NotFoundException('Application not found');
    await this.applyBidEdit(application, dto, null);
    return this.getTrackingBid(id);
  }

  /**
   * Stream one of the bid's own attachments back to the verified session.
   *
   * `tender-applications/` is a protected prefix, so the file server will not
   * serve these keys to a browser — this route and the admin one are the only
   * ways to read them. The document is looked up BY application, so a token for
   * bid A cannot name a document id belonging to bid B.
   */
  async getTrackingDocument(applicationId: string, documentId: string) {
    const doc = await this.docRepo.findOne({ where: { id: documentId, applicationId } });
    if (!doc) throw new NotFoundException('Document not found on this bid');
    const { buffer, mimeType } = await this.storage.fetch(doc.fileKey);
    return { fileName: doc.fileName, buffer, mimeType: doc.mimeType || mimeType };
  }

  /** Same read-back for an admin who holds TENDER_VIEW — see adminGetById for the scoping. */
  async adminGetDocument(applicationId: string, documentId: string) {
    return this.getTrackingDocument(applicationId, documentId);
  }

  /**
   * And for the signed-in bidder looking at their own bids. `findOwn` is what
   * enforces ownership — without it, any authenticated user could read any bid's
   * attachments by id.
   */
  async getOwnDocument(applicationId: string, documentId: string, applicantId: string) {
    await this.findOwn(applicationId, applicantId);
    return this.getTrackingDocument(applicationId, documentId);
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
    dto: UpdateTenderApplicationDto,
  ): Promise<TenderApplication> {
    const application = await this.findOwn(id, applicantId);
    await this.applyBidEdit(application, dto, applicantId);
    return this.findOwn(id, applicantId);
  }

  /**
   * The edit itself, shared by the two ways a bidder can reach it: signed in
   * (`update`, scoped by applicantId) and via a verified OTP tracking session
   * (`updateViaTracking`, scoped by the token's subject). Ownership is settled by
   * the caller — by the time we get here, the editor is the bid's owner.
   */
  private async applyBidEdit(
    application: TenderApplication,
    dto: UpdateTenderApplicationDto,
    actorId: string | null,
  ): Promise<void> {
    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new ForbiddenException('Only a submitted or more-info-requested bid can be updated');
    }

    // The tender must still exist and be published. The DEADLINE, though, is only
    // enforced on a voluntary revision — a bidder answering a reviewer's request
    // must be able to answer it even if the deadline has since passed.
    const tender = await this.loadTender(application.tenderId);
    if (!this.isAnsweringRequest(application)) this.assertTenderOpen(tender);

    const scope = this.editScope(application);

    // Validated BEFORE anything is written. These checks used to live down with
    // the document write, which ran last — so a rejected out-of-scope attachment
    // still left behind the scalar changes, the cleared "more info" ask and the
    // status flip back to `submitted` that had already been committed above it.
    // The bidder got a 403 and lost the reviewer's request anyway.
    this.assertDocumentsInScope(dto.documents, scope.documents);

    // Only the columns the scope allows are read off the payload; the rest keep
    // their stored value. This is the enforcement, not the UI — a bidder asked to
    // fix their TIN cannot restate their price by posting a fuller body.
    const patch: Record<string, unknown> = {};
    for (const column of scope.fields) {
      const supplied = (dto as Record<string, unknown>)[column];
      if (supplied !== undefined) patch[column] = supplied;
    }
    Object.assign(application, patch);

    // A re-submission answers whatever the reviewer asked for, so the ask is
    // retired and the bid re-enters the queue as a plain submission.
    if (application.status === TenderApplicationStatus.MORE_INFO_REQUESTED) {
      application.moreInfoRequested = null;
      application.moreInfoFields = null;
      application.moreInfoDocumentTypes = null;
      application.status = TenderApplicationStatus.SUBMITTED;
      await this.recordStatusChange(
        application.id,
        TenderApplicationStatus.MORE_INFO_REQUESTED,
        TenderApplicationStatus.SUBMITTED,
        actorId,
        'Bid updated and re-submitted by applicant',
      );
    }

    await this.saveScalarFields(application);

    if (dto.documents?.length) {
      await this.replaceDocuments(application.id, dto.documents, scope.documents);
    }
  }

  /**
   * What this bid's owner may currently change.
   *
   * A plain `submitted` bid is fully editable — nothing has been reviewed, so
   * there is nothing to protect. Once a reviewer has asked for specific
   * corrections, the bid narrows to exactly what they named. An unscoped
   * more-info request (legacy rows, written before the ask could be targeted)
   * stays fully editable rather than becoming uneditable.
   */
  private editScope(application: TenderApplication): {
    /** Field GROUPS, for the UI. */
    fieldGroups: TenderMoreInfoField[];
    /** The columns those groups resolve to, for enforcement. */
    fields: Set<string>;
    documents: TenderDocumentType[];
  } {
    const scoped =
      application.status === TenderApplicationStatus.MORE_INFO_REQUESTED &&
      (application.moreInfoFields?.length || application.moreInfoDocumentTypes?.length);

    const fieldGroups = scoped ? (application.moreInfoFields ?? []) : [...TENDER_MORE_INFO_FIELDS];
    const documents = scoped
      ? (application.moreInfoDocumentTypes ?? [])
      : [...REQUIRED_TENDER_DOCUMENTS];

    return { fieldGroups, fields: columnsForFields(fieldGroups), documents };
  }

  /**
   * Merge the supplied documents in by type, replacing only what was sent.
   *
   * Deliberately NOT a wholesale delete-and-reinsert: a scoped re-submission
   * carries only the requested attachments, and wiping the others would drop
   * files the reviewer never asked about — along with the `verified` flags they
   * had already earned. The complete-set invariant is checked afterwards against
   * what actually remains.
   */
  /**
   * Pure validation — no writes, so it is safe to run before anything is
   * committed. One row per type, and every type one the reviewer actually asked
   * for.
   */
  private assertDocumentsInScope(
    documents: TenderDocumentDto[] | undefined,
    allowed: TenderDocumentType[],
  ): void {
    if (!documents?.length) return;

    const seen = new Set<TenderDocumentType>();
    for (const doc of documents) {
      if (seen.has(doc.docType)) {
        throw new BadRequestException(`Duplicate document supplied for "${doc.docType}"`);
      }
      seen.add(doc.docType);
      if (!allowed.includes(doc.docType)) {
        throw new ForbiddenException(`You were not asked to update the "${doc.docType}" document`);
      }
    }
  }

  private async replaceDocuments(
    applicationId: string,
    documents: TenderDocumentDto[],
    allowed: TenderDocumentType[],
  ): Promise<void> {
    // Re-asserted here as well as up-front: this is the last gate before the
    // write, and it must not depend on a caller having checked first.
    this.assertDocumentsInScope(documents, allowed);

    for (const doc of documents) {
      await this.docRepo.delete({ applicationId, docType: doc.docType });
      await this.docRepo.save(
        this.docRepo.create({
          applicationId,
          docType: doc.docType,
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
        }),
      );
    }

    const remaining = await this.docRepo.find({ where: { applicationId } });
    const present = new Set(remaining.map((d) => d.docType));
    const missing = REQUIRED_TENDER_DOCUMENTS.filter((type) => !present.has(type));
    if (missing.length) {
      throw new BadRequestException(`Missing required document(s): ${missing.join(', ')}`);
    }
  }

  async withdraw(id: string, applicantId: string): Promise<TenderApplication> {
    const application = await this.findOwn(id, applicantId);
    await this.applyWithdrawal(application, applicantId);
    return application;
  }

  /**
   * Withdraw from a verified OTP tracking session — the bidder proved control of
   * the phone on the bid, which is the same standing the signed-in path requires.
   */
  async withdrawViaTracking(id: string) {
    const application = await this.appRepo.findOne({ where: { id } });
    if (!application) throw new NotFoundException('Application not found');
    await this.applyWithdrawal(application, null);
    return this.getTrackingBid(id);
  }

  /** Shared by both withdrawal paths; ownership is settled by the caller. */
  private async applyWithdrawal(
    application: TenderApplication,
    actorId: string | null,
  ): Promise<void> {
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
      actorId,
      'Withdrawn by applicant',
    );
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

      case TenderStatusAction.REQUEST_MORE_INFO: {
        if (!dto.notes?.trim()) {
          throw new BadRequestException('Notes are required when requesting more info');
        }
        const fields = dto.moreInfoFields ?? [];
        const documents = dto.moreInfoDocumentTypes ?? [];
        // An ask that names nothing leaves the bidder a note they cannot act on:
        // the edit form would offer no field and no upload slot, and the bid would
        // sit in more_info_requested until it expired.
        if (fields.length === 0 && documents.length === 0) {
          throw new BadRequestException(
            'Select at least one field or document the bidder should correct',
          );
        }
        application.moreInfoRequested = dto.notes;
        application.moreInfoFields = fields.length ? fields : null;
        application.moreInfoDocumentTypes = documents.length ? documents : null;
        toStatus = TenderApplicationStatus.MORE_INFO_REQUESTED;
        break;
      }

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

    // Any move off "more info requested" retires the ask, so a later edit can't
    // be measured against a scope that no longer applies.
    if (toStatus !== TenderApplicationStatus.MORE_INFO_REQUESTED) {
      application.moreInfoFields = null;
      application.moreInfoDocumentTypes = null;
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

  /**
   * Bid counts per tender, for the admin board's tender picker — one grouped
   * query rather than a count request per card, which would be a request per
   * tender on every page load.
   *
   * Returns a row for every tender that has at least one bid; the caller pairs
   * these with the tender list and reads a missing entry as zero.
   */
  async adminApplicationCountsByTender(): Promise<
    Array<{ tenderId: string; total: number; byStatus: Record<string, number> }>
  > {
    const rows = await this.appRepo
      .createQueryBuilder('app')
      .select('app.tenderId', 'tenderId')
      .addSelect('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.tenderId')
      .addGroupBy('app.status')
      .getRawMany<{ tenderId: string; status: string; count: string }>();

    const byTender = new Map<
      string,
      { tenderId: string; total: number; byStatus: Record<string, number> }
    >();
    for (const row of rows) {
      const count = Number(row.count);
      const entry = byTender.get(row.tenderId) ?? {
        tenderId: row.tenderId,
        total: 0,
        byStatus: {},
      };
      entry.total += count;
      entry.byStatus[row.status] = count;
      byTender.set(row.tenderId, entry);
    }

    return [...byTender.values()];
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
    // Company and contact names come from the bidder. See csv.util — quoting
    // alone leaves them able to open as a spreadsheet formula on the machine of
    // whoever downloads the bids.
    return toCsv(
      header,
      items.map((a) => [
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
      ]),
    );
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
