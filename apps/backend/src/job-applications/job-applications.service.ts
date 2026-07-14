import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  JobApplication,
  JobApplicationStatus,
  JobApplicationDocuments,
} from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import {
  UpdateJobApplicationStatusDto,
  JobApplicationStatusAction,
} from './dto/update-job-application-status.dto';

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRepository(JobApplicationStatusHistory)
    private readonly statusHistoryRepo: Repository<JobApplicationStatusHistory>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────────

  async create(applicantId: string, dto: CreateJobApplicationDto): Promise<JobApplication> {
    const docs = dto.documents;

    // Good-conduct requirement is either/or: a certificate number to verify OR
    // an uploaded certificate file — enforce it here so neither can be omitted.
    if (!docs.goodConductCertificateNumber && !docs.goodConductCertificate) {
      throw new BadRequestException(
        'Provide a good-conduct certificate number or upload the certificate',
      );
    }

    const trackingNumber = await this.generateTrackingNumber();

    const application = this.applicationRepo.create({
      trackingNumber,
      applicantId,
      fullNames: dto.fullNames,
      email: dto.email ?? null,
      phone: dto.phone,
      positionAppliedFor: dto.positionAppliedFor,
      districtId: dto.districtId ?? null,
      sectorId: dto.sectorId ?? null,
      cell: dto.cell ?? null,
      village: dto.village ?? null,
      documents: docs as JobApplicationDocuments,
      status: JobApplicationStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    const saved = await this.applicationRepo.save(application);
    await this.recordStatusChange(
      saved.id,
      null,
      JobApplicationStatus.SUBMITTED,
      applicantId,
      'Application submitted',
    );
    return saved;
  }

  // ── Queries ────────────────────────────────────────────────────────────────────

  async findOwn(id: string, applicantId: string): Promise<JobApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.applicantId !== applicantId) throw new ForbiddenException('Access denied');
    return application;
  }

  async listOwn(
    applicantId: string,
    filters: { status?: string } = {},
  ): Promise<JobApplication[]> {
    return this.applicationRepo.find({
      where: {
        applicantId,
        ...(filters.status ? { status: filters.status as JobApplicationStatus } : {}),
      },
      relations: ['statusHistory'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Public status lookup by tracking number — no auth. Returns only what an
   * applicant needs to follow progress (no documents, phone or email), so a
   * leaked tracking number can't expose sensitive personal data.
   */
  async trackByNumber(trackingNumber: string) {
    const application = await this.applicationRepo.findOne({
      where: { trackingNumber: trackingNumber.trim().toUpperCase() },
      relations: ['statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');
    return {
      trackingNumber: application.trackingNumber,
      fullNames: application.fullNames,
      positionAppliedFor: application.positionAppliedFor,
      status: application.status,
      submittedAt: application.submittedAt,
      createdAt: application.createdAt,
      statusHistory: (application.statusHistory ?? [])
        .map((h) => ({ fromStatus: h.fromStatus, toStatus: h.toStatus, changedAt: h.changedAt }))
        .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime()),
    };
  }

  async cancel(id: string, applicantId: string): Promise<JobApplication> {
    const application = await this.findOwn(id, applicantId);
    if (
      ![JobApplicationStatus.SUBMITTED, JobApplicationStatus.UNDER_REVIEW].includes(
        application.status,
      )
    ) {
      throw new ForbiddenException('Only submitted or under-review applications can be cancelled');
    }
    const prev = application.status;
    application.status = JobApplicationStatus.CANCELLED;
    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      JobApplicationStatus.CANCELLED,
      applicantId,
      'Cancelled by applicant',
    );
    return application;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────────

  async adminList(filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const qb = this.applicationRepo
      .createQueryBuilder('app')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('app.status = :status', { status });
    if (dateFrom) qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1); // inclusive end date
      qb.andWhere('app.createdAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (search) {
      qb.andWhere(
        '(app.fullNames ILIKE :q OR app.phone ILIKE :q OR app.positionAppliedFor ILIKE :q OR app.trackingNumber ILIKE :q)',
        { q: `%${search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGetById(id: string): Promise<JobApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateJobApplicationStatusDto,
  ): Promise<JobApplication> {
    const application = await this.adminGetById(id);
    const prev = application.status;

    let toStatus: JobApplicationStatus;
    switch (dto.action) {
      case JobApplicationStatusAction.START_REVIEW:
        toStatus = JobApplicationStatus.UNDER_REVIEW;
        break;
      case JobApplicationStatusAction.SHORTLIST:
        toStatus = JobApplicationStatus.SHORTLISTED;
        break;
      case JobApplicationStatusAction.ACCEPT:
        toStatus = JobApplicationStatus.ACCEPTED;
        break;
      case JobApplicationStatusAction.REJECT:
        if (!dto.reason?.trim()) {
          throw new BadRequestException('A rejection reason is required');
        }
        application.rejectionReason = dto.reason;
        toStatus = JobApplicationStatus.REJECTED;
        break;
      case JobApplicationStatusAction.REQUEST_MORE_INFO:
        if (!dto.notes?.trim()) {
          throw new BadRequestException('Notes are required when requesting more info');
        }
        application.moreInfoRequested = dto.notes;
        toStatus = JobApplicationStatus.MORE_INFO_REQUESTED;
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

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /** RMC-JOB-<YYYYMM>-<5-digit-seq> — allocated once, on submission. */
  private async generateTrackingNumber(): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('job_application_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `RMC-JOB-${year}${month}-${seq}`;
  }

  /**
   * Persist scalar column changes via a targeted `.update()` rather than
   * `.save()` on the loaded entity — mirrors GoodConductService.saveScalarFields:
   * saving an entity loaded WITH its statusHistory relation makes TypeORM null
   * out the FK of any child row not in the (stale) in-memory array.
   */
  private async saveScalarFields(application: JobApplication): Promise<void> {
    const { statusHistory: _statusHistory, id, ...columns } = application as JobApplication &
      Record<string, unknown>;
    void _statusHistory;
    await this.applicationRepo.update(id as string, columns);
  }

  private async recordStatusChange(
    applicationId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<JobApplicationStatusHistory> {
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
