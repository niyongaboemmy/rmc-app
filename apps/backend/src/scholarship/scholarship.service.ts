import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, DataSource } from 'typeorm';
import {
  ScholarshipApplication,
  ScholarshipApplicationStatus,
} from './entities/scholarship-application.entity';
import { ScholarshipStatusHistory } from './entities/scholarship-status-history.entity';
import {
  ScholarshipProgram,
  ScholarshipProgramStatus,
  type I18nText,
} from './entities/scholarship-program.entity';
import { ScholarshipDocument } from './entities/scholarship-document.entity';
import { CreateScholarshipApplicationDto } from './dto/create-scholarship-application.dto';
import { CreateScholarshipProgramDto } from './dto/create-scholarship-program.dto';
import { UpdateScholarshipProgramDto } from './dto/update-scholarship-program.dto';
import { SaveScholarshipDocumentDto } from './dto/save-scholarship-document.dto';
import {
  UpdateScholarshipStatusDto,
  ScholarshipStatusAction,
} from './dto/update-scholarship-status.dto';
import { districtCode } from '../common/district-codes';
import { toCsv } from '../common/csv.util';
import { sanitizeDescription, sanitizeDescriptionI18n } from './scholarship-description';
import { generateTrackingCode } from '../tracking/tracking-code.util';
import { slugify } from '../common/slugify.util';
import type { TrackingSubject } from '../tracking/tracking-verification.service';
import { User } from '../users/entities/user.entity';
import { District } from '../locations/entities/district.entity';

/**
 * An application in any of these statuses blocks a second one for the same
 * scholarship. Only `rejected` and `cancelled` let a member apply again.
 *
 * This list MUST match the partial unique index `IDX_scholarship_app_one_per_program`,
 * which excludes exactly those two. It did not: `confirmed` was listed here as
 * non-blocking while the index blocked it, so a member re-applying to a
 * scholarship they had already been awarded got past this check and then hit a
 * duplicate-key error — a 500 where the ConflictException below was meant to
 * explain the problem.
 *
 * Aligned toward the index rather than away from it, because having already won
 * a scholarship is a reason not to apply to it a second time.
 */
const ACTIVE_STATUSES: ScholarshipApplicationStatus[] = [
  ScholarshipApplicationStatus.DRAFT,
  ScholarshipApplicationStatus.SUBMITTED,
  ScholarshipApplicationStatus.UNDER_REVIEW,
  ScholarshipApplicationStatus.APPROVED,
  ScholarshipApplicationStatus.CONFIRMED,
];

@Injectable()
export class ScholarshipService {
  constructor(
    @InjectRepository(ScholarshipApplication)
    private readonly applicationRepo: Repository<ScholarshipApplication>,
    @InjectRepository(ScholarshipStatusHistory)
    private readonly statusHistoryRepo: Repository<ScholarshipStatusHistory>,
    @InjectRepository(ScholarshipProgram)
    private readonly programRepo: Repository<ScholarshipProgram>,
    @InjectRepository(ScholarshipDocument)
    private readonly documentRepo: Repository<ScholarshipDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Programs (public) ────────────────────────────────────────────────────────

  /**
   * Public catalogue. Filters on `status`, not the legacy `isOpen` — a draft must
   * never be reachable, and `isOpen` is a derived convenience that a stale row
   * could still have set to true.
   *
   * Closed opportunities are returned too: a scholarship that ran and closed is
   * evidence the programme is real, and the landing page shows them in an
   * archive.
   *
   * A NULL slug excludes a row outright. The slug is what makes a scholarship
   * addressable, so a row without one was never announced — which is exactly how
   * migration 054's synthetic "pre-2026" container holds legacy applications
   * without ever appearing on the public list.
   */
  async listPrograms(): Promise<ScholarshipProgram[]> {
    return this.programRepo.find({
      where: [
        { status: ScholarshipProgramStatus.PUBLISHED, slug: Not(IsNull()) },
        { status: ScholarshipProgramStatus.CLOSED, slug: Not(IsNull()) },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * One opportunity, by its public slug.
   *
   * A draft 404s rather than 403s — a 403 would confirm that a scholarship by
   * that name exists and is being prepared, which is RMC's business until they
   * publish it. Same rule the discussions contract settled on.
   */
  async getProgramBySlug(slug: string): Promise<ScholarshipProgram> {
    const program = await this.programRepo.findOne({
      where: [
        { slug, status: ScholarshipProgramStatus.PUBLISHED },
        { slug, status: ScholarshipProgramStatus.CLOSED },
      ],
    });
    if (!program) throw new NotFoundException('Scholarship not found');
    return program;
  }

  async getProgram(id: string): Promise<ScholarshipProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  /**
   * The gate every application must pass, checked at BOTH draft creation and
   * submit.
   *
   * Submit is the one that counts. A draft can sit for days, so checking only at
   * creation would let an application started an hour before the deadline be
   * submitted a week after it. Creation is checked too, so a member cannot even
   * begin against a scholarship that is closed — better to say so before they
   * fill in four steps.
   *
   * Refusals are 409, not 400: the request is well-formed, it is the STATE that
   * refuses it. `ConflictException` maps to the CONFLICT error code the frontend
   * already distinguishes.
   */
  private assertAcceptingApplications(program: ScholarshipProgram): void {
    if (program.status !== ScholarshipProgramStatus.PUBLISHED) {
      throw new ConflictException('This scholarship is not open for applications.');
    }
    const now = Date.now();
    if (program.opensAt && +new Date(program.opensAt) > now) {
      throw new ConflictException('Applications for this scholarship have not opened yet.');
    }
    if (program.deadline && +new Date(program.deadline) < now) {
      throw new ConflictException('The deadline for this scholarship has passed.');
    }
  }

  // ── Create / Draft ───────────────────────────────────────────────────────────

  async createDraft(
    applicantId: string,
    dto: CreateScholarshipApplicationDto,
  ): Promise<ScholarshipApplication> {
    // An application now always targets a scholarship, so the uniqueness rule is
    // per scholarship rather than global — a member may hold one live
    // application against each of several different scholarships.
    const existing = await this.applicationRepo.findOne({
      where: { applicantId, programId: dto.programId, status: In(ACTIVE_STATUSES) },
    });
    if (existing) {
      throw new ConflictException(
        `You already have an active application for this scholarship (status: ${existing.status})`,
      );
    }

    const program = await this.programRepo.findOne({ where: { id: dto.programId } });
    if (!program) throw new NotFoundException('Scholarship not found');
    this.assertAcceptingApplications(program);

    const applicationNumber = await this.generateApplicationNumber(dto.districtId ?? null);

    const application = this.applicationRepo.create({
      applicationNumber,
      trackingCode: generateTrackingCode('RMC-SCH'),
      applicantId,
      programId: dto.programId ?? null,
      fullNames: dto.fullNames,
      dateOfBirth: dto.dateOfBirth ?? null,
      gender: dto.gender ?? null,
      nationalId: dto.nationalId ?? null,
      phone: dto.phone,
      email: dto.email ?? null,
      districtId: dto.districtId ?? null,
      sectorId: dto.sectorId ?? null,
      cell: dto.cell ?? null,
      village: dto.village ?? null,
      schoolName: dto.schoolName,
      educationLevel: dto.educationLevel,
      currentYear: dto.currentYear,
      averageGrade: dto.averageGrade ?? null,
      guardianName: dto.guardianName,
      guardianPhone: dto.guardianPhone,
      relationship: dto.relationship,
      motivation: dto.motivation,
      status: ScholarshipApplicationStatus.DRAFT,
    });

    const saved = await this.applicationRepo.save(application);
    await this.recordStatusChange(
      saved.id,
      null,
      ScholarshipApplicationStatus.DRAFT,
      applicantId,
      'Application draft created',
    );
    return saved;
  }

  async updateDraft(
    id: string,
    applicantId: string,
    dto: Partial<CreateScholarshipApplicationDto>,
  ): Promise<ScholarshipApplication> {
    const application = await this.findOwn(id, applicantId);

    if (application.status !== ScholarshipApplicationStatus.DRAFT) {
      throw new ForbiddenException('Only draft applications can be updated');
    }

    Object.assign(application, {
      // programId is deliberately NOT taken from the DTO. The scholarship an
      // application targets is fixed when the draft is created: letting an edit
      // move it would allow an applicant to fill a form against an open
      // scholarship and then retarget it at one whose deadline has passed,
      // sidestepping the check in submit().
      fullNames: dto.fullNames ?? application.fullNames,
      dateOfBirth: dto.dateOfBirth ?? application.dateOfBirth,
      gender: dto.gender ?? application.gender,
      nationalId: dto.nationalId ?? application.nationalId,
      phone: dto.phone ?? application.phone,
      email: dto.email ?? application.email,
      districtId: dto.districtId ?? application.districtId,
      sectorId: dto.sectorId ?? application.sectorId,
      cell: dto.cell ?? application.cell,
      village: dto.village ?? application.village,
      schoolName: dto.schoolName ?? application.schoolName,
      educationLevel: dto.educationLevel ?? application.educationLevel,
      currentYear: dto.currentYear ?? application.currentYear,
      averageGrade: dto.averageGrade ?? application.averageGrade,
      guardianName: dto.guardianName ?? application.guardianName,
      guardianPhone: dto.guardianPhone ?? application.guardianPhone,
      relationship: dto.relationship ?? application.relationship,
      motivation: dto.motivation ?? application.motivation,
    });

    await this.saveScalarFields(application);
    return application;
  }

  async submit(id: string, applicantId: string): Promise<ScholarshipApplication> {
    const application = await this.findOwn(id, applicantId);
    if (application.status !== ScholarshipApplicationStatus.DRAFT) {
      throw new ForbiddenException('Only draft applications can be submitted');
    }

    // Re-check the window HERE, not only at creation. This is the check that
    // decides whether an application counts: the draft may have been started
    // days ago, and the deadline can have passed or the scholarship been closed
    // in the meantime.
    if (application.programId) {
      const program = await this.programRepo.findOne({ where: { id: application.programId } });
      if (!program) throw new NotFoundException('Scholarship not found');
      this.assertAcceptingApplications(program);
    }

    const prev = application.status;
    application.status = ScholarshipApplicationStatus.SUBMITTED;
    application.submittedAt = new Date();
    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      ScholarshipApplicationStatus.SUBMITTED,
      applicantId,
      'Submitted by applicant',
    );
    return application;
  }

  async cancel(id: string, applicantId: string): Promise<ScholarshipApplication> {
    const application = await this.findOwn(id, applicantId);
    if (
      ![ScholarshipApplicationStatus.DRAFT, ScholarshipApplicationStatus.SUBMITTED].includes(
        application.status,
      )
    ) {
      throw new ForbiddenException('Only draft or submitted applications can be cancelled');
    }
    const prev = application.status;
    application.status = ScholarshipApplicationStatus.CANCELLED;
    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      ScholarshipApplicationStatus.CANCELLED,
      applicantId,
      'Cancelled by applicant',
    );
    return application;
  }

  async findOwn(id: string, applicantId: string): Promise<ScholarshipApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['statusHistory', 'documents'],
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.applicantId !== applicantId) throw new ForbiddenException('Access denied');
    return application;
  }

  async listOwn(applicantId: string): Promise<ScholarshipApplication[]> {
    return this.applicationRepo.find({
      where: { applicantId },
      relations: ['statusHistory'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Documents (member) ────────────────────────────────────────────────────────

  /**
   * The evidence an application rests on is fixed at the same moment its text
   * is: when the applicant submits.
   *
   * Ownership alone used to be the whole check, so an applicant could attach or
   * remove documents at any point — including on a CONFIRMED application, after
   * a reviewer had read and verified them. `updateDraft` has always refused to
   * touch anything past DRAFT; there is no reading on which the essay is frozen
   * but the transcript backing it is not.
   *
   * DRAFT is the right line and not a conservative guess: the wizard uploads
   * every file first and calls submit last, so nothing in the real flow attaches
   * a document to an application that has already been submitted.
   */
  private assertDocumentsEditable(application: ScholarshipApplication): void {
    if (application.status !== ScholarshipApplicationStatus.DRAFT) {
      throw new ForbiddenException(
        'Documents can only be changed while the application is still a draft.',
      );
    }
  }

  /**
   * Records an already-uploaded supporting document for an application the
   * caller owns. Documents are appended (multiple allowed per type), never
   * upserted — an applicant may attach several transcripts/records.
   */
  async saveDocument(
    id: string,
    applicantId: string,
    dto: SaveScholarshipDocumentDto,
  ): Promise<ScholarshipDocument> {
    this.assertDocumentsEditable(await this.findOwn(id, applicantId));
    const doc = this.documentRepo.create({
      applicationId: id,
      documentType: dto.documentType,
      requirementKey: dto.requirementKey ?? null,
      fileKey: dto.fileKey,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      uploadedBy: applicantId,
    });
    return this.documentRepo.save(doc);
  }

  async deleteDocument(id: string, documentId: string, applicantId: string): Promise<void> {
    this.assertDocumentsEditable(await this.findOwn(id, applicantId));
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, applicationId: id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentRepo.remove(doc);
  }

  // ── Public status tracking ───────────────────────────────────────────────────

  /**
   * Resolve a tracking code to the record and the phone an OTP may be sent to.
   *
   * By `trackingCode` ONLY — never `applicationNumber`. The numbers are
   * sequential, so accepting them would let anyone walk the counter and fire an
   * SMS at each applicant in turn, which is both a disclosure oracle and a way
   * to spam real people from a public endpoint. Tenders reached the same
   * conclusion in migration 047; this matches it.
   *
   * Returns null rather than throwing: the caller hands null to the tracking
   * service, which answers identically for "no such code" and "code exists" so
   * the response cannot be used to test whether a code is real.
   */
  async findSubjectByCode(code: string): Promise<TrackingSubject | null> {
    const value = (code || '').trim().toUpperCase();
    if (!value) return null;
    const app = await this.applicationRepo.findOne({
      where: { trackingCode: value },
      select: { id: true, phone: true },
    });
    return app ? { id: app.id, phone: app.phone } : null;
  }

  /**
   * The ONLY scholarship projection that reaches an unauthenticated caller, and
   * only after they have proved control of the phone on the record.
   *
   * Built field by field on purpose. What this replaced returned the entity —
   * `nationalId`, `dateOfBirth`, both phone numbers, the guardian's name, the
   * motivation essay and every document row — to anyone who could guess a
   * sequential number. An applicant tracking their own case needs to know where
   * it has got to, not to be read back their own identity documents, so none of
   * that is here: name and school to confirm they opened the right record,
   * then status.
   */
  async getTrackingInfo(id: string) {
    const app = await this.applicationRepo.findOne({
      where: { id },
      relations: ['statusHistory'],
    });
    if (!app) throw new NotFoundException('Application not found');
    return {
      trackingCode: app.trackingCode,
      applicationNumber: app.applicationNumber,
      fullNames: app.fullNames,
      schoolName: app.schoolName,
      educationLevel: app.educationLevel,
      status: app.status,
      rejectionReason: app.rejectionReason,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      // Dates only — the timeline drives the progress bar. `changedBy` and any
      // reviewer note stay behind the admin console.
      statusHistory: (app.statusHistory ?? [])
        .map((h) => ({ toStatus: h.toStatus, changedAt: h.changedAt }))
        .sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt)),
    };
  }

  // ── Admin: applications ──────────────────────────────────────────────────────

  async adminList(filters: {
    status?: string;
    programId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, programId, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const qb = this.applicationRepo
      .createQueryBuilder('app')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('app.status = :status', { status });
    if (programId) qb.andWhere('app.programId = :programId', { programId });
    if (dateFrom) qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (search) {
      qb.andWhere('(app.fullNames ILIKE :q OR app.phone ILIKE :q)', { q: `%${search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGetById(id: string): Promise<ScholarshipApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['statusHistory', 'documents'],
    });
    if (!application) throw new NotFoundException('Application not found');

    const applicant = application.applicantId
      ? await this.userRepo.findOne({ where: { id: application.applicantId } })
      : null;
    if (applicant) {
      (application as ScholarshipApplication & { applicant?: unknown }).applicant = {
        id: applicant.id,
        name: [applicant.firstName, applicant.lastName].filter(Boolean).join(' '),
        email: applicant.email,
        phone: applicant.phone,
      };
    }

    /*
     * The scholarship this application answers.
     *
     * Attached the same ad-hoc way as `applicant` rather than as a relation,
     * because `saveScalarFields` strips loaded relations before its targeted
     * `.update()` and a new one would have to be added to that list too.
     *
     * `requiredDocuments` comes along deliberately: it is what lets the review
     * screen show each uploaded file under the requirement it answers, and spot
     * a required document that never arrived.
     */
    if (application.programId) {
      const program = await this.programRepo.findOne({
        where: { id: application.programId },
        select: {
          id: true,
          slug: true,
          title: true,
          titleI18n: true,
          level: true,
          deadline: true,
          status: true,
          requiredDocuments: true,
        },
      });
      if (program) {
        (application as ScholarshipApplication & { program?: unknown }).program = program;
      }
    }
    return application;
  }

  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateScholarshipStatusDto,
  ): Promise<ScholarshipApplication> {
    const application = await this.adminGetById(id);
    const prev = application.status;

    let toStatus: ScholarshipApplicationStatus;
    switch (dto.action) {
      case ScholarshipStatusAction.START_REVIEW:
        if (application.status !== ScholarshipApplicationStatus.SUBMITTED) {
          throw new BadRequestException('Only submitted applications can start review');
        }
        toStatus = ScholarshipApplicationStatus.UNDER_REVIEW;
        break;
      case ScholarshipStatusAction.APPROVE:
        if (application.status !== ScholarshipApplicationStatus.UNDER_REVIEW) {
          throw new BadRequestException('Only applications under review can be approved');
        }
        toStatus = ScholarshipApplicationStatus.APPROVED;
        break;
      case ScholarshipStatusAction.REJECT:
        // Rejection was the one action with no source-status check, so a draft
        // the applicant had not finished writing could be rejected out from
        // under them, and an application already rejected could be rejected
        // again, rewriting its outcome and its reason.
        //
        // APPROVED is in the allowed list deliberately: an offer that has been
        // made but not yet accepted can still be withdrawn, and the board lets a
        // reviewer do exactly that. CONFIRMED is not — the applicant has taken
        // the place up, and revoking an award is not a drag between two columns.
        if (
          ![
            ScholarshipApplicationStatus.SUBMITTED,
            ScholarshipApplicationStatus.UNDER_REVIEW,
            ScholarshipApplicationStatus.APPROVED,
          ].includes(application.status)
        ) {
          throw new BadRequestException(
            'Only an application that is submitted, under review, or approved can be rejected',
          );
        }
        if (!dto.reason?.trim()) {
          throw new BadRequestException('A rejection reason is required');
        }
        application.rejectionReason = dto.reason;
        toStatus = ScholarshipApplicationStatus.REJECTED;
        break;
      case ScholarshipStatusAction.CONFIRM:
        if (application.status !== ScholarshipApplicationStatus.APPROVED) {
          throw new BadRequestException('Only approved applications can be confirmed');
        }
        toStatus = ScholarshipApplicationStatus.CONFIRMED;
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

    return application;
  }

  /** Marks a submitted document as verified / unverified and returns the refreshed application. */
  async adminVerifyDocument(
    applicationId: string,
    documentId: string,
    adminId: string,
    verified: boolean,
  ): Promise<ScholarshipApplication> {
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, applicationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    doc.verified = verified;
    doc.verifiedBy = verified ? adminId : null;
    doc.verifiedAt = verified ? new Date() : null;
    await this.documentRepo.save(doc);

    return this.adminGetById(applicationId);
  }

  /**
   * Applications by status, optionally scoped to ONE scholarship.
   *
   * `programId` matters now that every application targets a scholarship: the
   * service-wide total answers "how busy are we", but the question an
   * administrator actually asks is "how did the S4 bursary do". Same filter the
   * CSV export already accepted, so the numbers on screen and the rows in the
   * download describe the same set.
   */
  async adminGetReports(filters: { programId?: string; dateFrom?: string; dateTo?: string } = {}) {
    const qb = this.applicationRepo.createQueryBuilder('app');
    if (filters.programId)
      qb.andWhere('app.programId = :programId', { programId: filters.programId });
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

    return { total, byStatus };
  }

  /** Builds a CSV export of applications matching the given filters (no pagination). */
  async adminExportCsv(filters: {
    status?: string;
    programId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string> {
    const { items } = await this.adminList({ ...filters, page: 1, limit: Number.MAX_SAFE_INTEGER });

    const header = [
      'id',
      'applicationNumber',
      'fullNames',
      'phone',
      'email',
      'schoolName',
      'educationLevel',
      'status',
      'createdAt',
    ];
    // `fullNames` and `schoolName` are written by the applicant. See csv.util —
    // quoting alone leaves them able to open the file as a spreadsheet formula
    // on the reviewer's machine.
    return toCsv(
      header,
      items.map((a) => [
        a.id,
        a.applicationNumber,
        a.fullNames,
        a.phone,
        a.email,
        a.schoolName,
        a.educationLevel,
        a.status,
        a.createdAt?.toISOString(),
      ]),
    );
  }

  // ── Admin: programs ───────────────────────────────────────────────────────────

  async adminListPrograms(): Promise<ScholarshipProgram[]> {
    return this.programRepo.find({ order: { createdAt: 'DESC' } });
  }

  async adminCreateProgram(dto: CreateScholarshipProgramDto): Promise<ScholarshipProgram> {
    const program = this.programRepo.create({
      ...this.programFieldsFromDto(dto),
      title: dto.title,
      description: dto.description,
      // Always a draft. Publishing is a separate, validated action so a
      // half-written scholarship cannot reach the public page by accident.
      status: ScholarshipProgramStatus.DRAFT,
      isOpen: false,
      slug: await this.uniqueProgramSlug(dto.title),
    });
    return this.programRepo.save(program);
  }

  async adminUpdateProgram(
    id: string,
    dto: UpdateScholarshipProgramDto,
  ): Promise<ScholarshipProgram> {
    const program = await this.getProgram(id);
    Object.assign(program, this.programFieldsFromDto(dto, program));

    // The slug is assigned once and then frozen. Re-slugging on every rename
    // would silently break links already published, printed or shared.
    if (!program.slug && program.title) {
      program.slug = await this.uniqueProgramSlug(program.title);
    }
    return this.programRepo.save(program);
  }

  /**
   * Make an opportunity public.
   *
   * A distinct action rather than a writable `status`, because this is the
   * moment it becomes real to applicants and it is the only place worth
   * refusing an incomplete record. Idempotent: re-publishing a published
   * opportunity is a no-op, not an error.
   */
  async adminPublishProgram(id: string): Promise<ScholarshipProgram> {
    const program = await this.getProgram(id);
    if (program.status === ScholarshipProgramStatus.PUBLISHED) return program;

    const missing: string[] = [];
    if (!program.title?.trim()) missing.push('title');
    if (!program.description?.trim()) missing.push('description');
    if (!program.deadline) missing.push('deadline');
    if (missing.length) {
      throw new BadRequestException(
        `Cannot publish without: ${missing.join(', ')}. An applicant cannot act on an incomplete offer.`,
      );
    }
    if (!program.slug) program.slug = await this.uniqueProgramSlug(program.title);

    program.status = ScholarshipProgramStatus.PUBLISHED;
    program.isOpen = this.derivedIsOpen(program);
    return this.programRepo.save(program);
  }

  /**
   * Stop accepting applications.
   *
   * Applications already submitted are untouched — closing the call does not
   * abandon the people who answered it; they continue through review.
   */
  async adminCloseProgram(id: string): Promise<ScholarshipProgram> {
    const program = await this.getProgram(id);
    program.status = ScholarshipProgramStatus.CLOSED;
    program.isOpen = false;
    return this.programRepo.save(program);
  }

  async adminDeleteProgram(id: string): Promise<void> {
    const program = await this.getProgram(id);
    // Refuse to delete an opportunity people have applied to. The applications
    // would keep a dangling program_id and the admin console would show rows
    // whose scholarship no longer exists.
    const applications = await this.applicationRepo.count({ where: { programId: program.id } });
    if (applications > 0) {
      throw new ConflictException(
        `This scholarship has ${applications} application(s). Close it instead of deleting it.`,
      );
    }
    await this.programRepo.softDelete(program.id);
  }

  // ── Program helpers ─────────────────────────────────────────────────────────

  /** Maps the DTO onto column values, preserving anything the DTO omits. */
  private programFieldsFromDto(
    dto: UpdateScholarshipProgramDto,
    current?: ScholarshipProgram,
  ): Partial<ScholarshipProgram> {
    const keep = <T>(incoming: T | undefined, existing: T | undefined): T | undefined =>
      incoming !== undefined ? incoming : existing;

    return {
      title: keep(dto.title, current?.title),
      // The description is the one rich-text field, and the detail page renders
      // it as HTML. Cleaned on the way IN so what is stored is safe for every
      // reader — the page that shows it fetches in the browser, where the
      // frontend's jsdom-backed sanitiser cannot be used. See
      // scholarship-description.ts.
      description: sanitizeDescription(keep(dto.description, current?.description)),
      titleI18n: (keep(dto.titleI18n, current?.titleI18n ?? undefined) ?? null) as I18nText | null,
      descriptionI18n: sanitizeDescriptionI18n(
        (keep(dto.descriptionI18n, current?.descriptionI18n ?? undefined) ??
          null) as I18nText | null,
      ),
      requiredDocuments: (keep(dto.requiredDocuments, current?.requiredDocuments) ??
        []) as ScholarshipProgram['requiredDocuments'],
      attachments: keep(dto.attachments, current?.attachments) ?? [],
      level: keep(dto.level, current?.level ?? undefined) ?? null,
      slots: keep(dto.slots, current?.slots ?? undefined) ?? null,
      referenceNumber: keep(dto.referenceNumber, current?.referenceNumber ?? undefined) ?? null,
      opensAt: dto.opensAt ? new Date(dto.opensAt) : (current?.opensAt ?? null),
      deadline: dto.deadline ? new Date(dto.deadline) : (current?.deadline ?? null),
    };
  }

  /**
   * `isOpen` is derived, never authored — it exists only to keep the pre-existing
   * admin form and public list working until they are migrated to `status`.
   */
  private derivedIsOpen(program: ScholarshipProgram): boolean {
    if (program.status !== ScholarshipProgramStatus.PUBLISHED) return false;
    const now = Date.now();
    if (program.opensAt && +new Date(program.opensAt) > now) return false;
    if (program.deadline && +new Date(program.deadline) < now) return false;
    return true;
  }

  /** Slug from the title, suffixed until free. Soft-deleted rows still hold theirs. */
  private async uniqueProgramSlug(title: string): Promise<string> {
    const base = slugify(title || '') || 'scholarship';
    let slug = base;
    let n = 2;
    while (await this.programRepo.count({ where: { slug }, withDeleted: true })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  // ── Application Number ──────────────────────────────────────────────────────

  /** RMC-SCH-<district-code>-<YYYYMM>-<5-digit-seq>. '00' stands in for an unrecognised/missing district. */
  private async generateApplicationNumber(districtId: string | null): Promise<string> {
    const district = districtId
      ? await this.districtRepo.findOne({ where: { id: districtId } })
      : null;
    const result = await this.dataSource.query(
      `SELECT nextval('scholarship_application_seq') AS seq`,
    );
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const code = districtCode(district?.name) ?? '00';
    return `RMC-SCH-${code}-${year}${month}-${seq}`;
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /**
   * Persists scalar column changes via a targeted `.update()` rather than
   * `.save()` on the loaded entity — avoids TypeORM's default
   * `orphanedRowAction: 'nullify'` nulling the FK of a statusHistory row that
   * isn't present in a stale in-memory relation array. See
   * good-conduct.service.ts's `saveScalarFields` for the full incident this
   * pattern was introduced to prevent.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async saveScalarFields(application: ScholarshipApplication): Promise<void> {
    // Strip every loaded relation (statusHistory, documents) and every ad-hoc
    // field `adminGetById` attaches (`applicant`, `program`) before the targeted
    // `.update()` — passing either to `.update()` throws, and the find methods
    // eager-load them.
    //
    // Anything new attached in adminGetById MUST be added here too: an
    // application loaded through it is handed straight to this method by
    // `adminUpdateStatus`, so a missed field turns every status change into a
    // 500. That is exactly what `program` did when it was added.
    const { statusHistory, documents, ...rest } = application as ScholarshipApplication & {
      applicant?: unknown;
      program?: unknown;
    };
    const {
      applicant: _applicant,
      program: _program,
      id,
      ...columns
    } = rest as Record<string, unknown>;
    await this.applicationRepo.update(id as string, columns);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  private async recordStatusChange(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<ScholarshipStatusHistory> {
    const history = this.statusHistoryRepo.create({
      applicationId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.statusHistoryRepo.save(history);
  }
}
