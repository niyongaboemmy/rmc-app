import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import {
  ScholarshipApplication,
  ScholarshipApplicationStatus,
} from './entities/scholarship-application.entity';
import { ScholarshipStatusHistory } from './entities/scholarship-status-history.entity';
import { ScholarshipProgram } from './entities/scholarship-program.entity';
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
import { User } from '../users/entities/user.entity';
import { District } from '../locations/entities/district.entity';

// An application in any of these statuses counts as "active" for duplicate
// detection — rejected/cancelled/confirmed never block a new application.
const ACTIVE_STATUSES: ScholarshipApplicationStatus[] = [
  ScholarshipApplicationStatus.DRAFT,
  ScholarshipApplicationStatus.SUBMITTED,
  ScholarshipApplicationStatus.UNDER_REVIEW,
  ScholarshipApplicationStatus.APPROVED,
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

  async listPrograms(): Promise<ScholarshipProgram[]> {
    return this.programRepo.find({
      where: { isOpen: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getProgram(id: string): Promise<ScholarshipProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  // ── Create / Draft ───────────────────────────────────────────────────────────

  async createDraft(
    applicantId: string,
    dto: CreateScholarshipApplicationDto,
  ): Promise<ScholarshipApplication> {
    const existing = await this.applicationRepo.findOne({
      where: { applicantId, status: In(ACTIVE_STATUSES) },
    });
    if (existing) {
      throw new ConflictException(
        `You already have an active scholarship application (status: ${existing.status})`,
      );
    }

    if (dto.programId) {
      const program = await this.programRepo.findOne({ where: { id: dto.programId } });
      if (!program) throw new NotFoundException('Scholarship program not found');
    }

    const applicationNumber = await this.generateApplicationNumber(dto.districtId ?? null);

    const application = this.applicationRepo.create({
      applicationNumber,
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
      programId: dto.programId ?? application.programId,
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
   * Records an already-uploaded supporting document for an application the
   * caller owns. Documents are appended (multiple allowed per type), never
   * upserted — an applicant may attach several transcripts/records.
   */
  async saveDocument(
    id: string,
    applicantId: string,
    dto: SaveScholarshipDocumentDto,
  ): Promise<ScholarshipDocument> {
    await this.findOwn(id, applicantId);
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

  async deleteDocument(id: string, documentId: string, applicantId: string): Promise<void> {
    await this.findOwn(id, applicantId);
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, applicationId: id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentRepo.remove(doc);
  }

  // ── Public status tracking ───────────────────────────────────────────────────

  async getByNumber(applicationNumber: string): Promise<ScholarshipApplication> {
    const application = await this.applicationRepo.findOne({
      where: { applicationNumber: applicationNumber.toUpperCase() },
      relations: ['statusHistory', 'documents'],
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
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

  async adminGetReports(filters: { dateFrom?: string; dateTo?: string } = {}) {
    const qb = this.applicationRepo.createQueryBuilder('app');
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
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((a) =>
      [
        a.id,
        a.applicationNumber,
        a.fullNames,
        a.phone,
        a.email,
        a.schoolName,
        a.educationLevel,
        a.status,
        a.createdAt?.toISOString(),
      ]
        .map(escape)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  // ── Admin: programs ───────────────────────────────────────────────────────────

  async adminListPrograms(): Promise<ScholarshipProgram[]> {
    return this.programRepo.find({ order: { createdAt: 'DESC' } });
  }

  async adminCreateProgram(dto: CreateScholarshipProgramDto): Promise<ScholarshipProgram> {
    const program = this.programRepo.create({
      title: dto.title,
      description: dto.description,
      level: dto.level ?? null,
      amount: dto.amount ?? null,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      isOpen: dto.isOpen ?? true,
    });
    return this.programRepo.save(program);
  }

  async adminUpdateProgram(
    id: string,
    dto: UpdateScholarshipProgramDto,
  ): Promise<ScholarshipProgram> {
    const program = await this.getProgram(id);
    Object.assign(program, {
      title: dto.title ?? program.title,
      description: dto.description ?? program.description,
      level: dto.level ?? program.level,
      amount: dto.amount ?? program.amount,
      deadline: dto.deadline ? new Date(dto.deadline) : program.deadline,
      isOpen: dto.isOpen ?? program.isOpen,
    });
    return this.programRepo.save(program);
  }

  async adminDeleteProgram(id: string): Promise<void> {
    const program = await this.getProgram(id);
    await this.programRepo.softDelete(program.id);
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
    // Strip every loaded relation (statusHistory, documents) and the ad-hoc
    // `applicant` field before the targeted `.update()` — passing a relation
    // array to `.update()` throws, and the find methods now eager-load these.
    const { statusHistory, documents, ...rest } = application as ScholarshipApplication & {
      applicant?: unknown;
    };
    const { applicant: _applicant, id, ...columns } = rest as Record<string, unknown>;
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
