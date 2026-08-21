import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import {
  JobApplication,
  JobApplicationStatus,
  JobApplicationDocuments,
} from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { JobPostingsService } from './job-postings.service';
import { generateTrackingCode } from './tracking-code.util';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import {
  UpdateJobApplicationStatusDto,
  JobApplicationStatusAction,
} from './dto/update-job-application-status.dto';
import { RespondMoreInfoDto } from './dto/respond-more-info.dto';

// Statuses that count as an application still "in progress" for duplicate detection.
const ACTIVE_STATUSES: JobApplicationStatus[] = [
  JobApplicationStatus.SUBMITTED,
  JobApplicationStatus.UNDER_REVIEW,
  JobApplicationStatus.SHORTLISTED,
  JobApplicationStatus.MORE_INFO_REQUESTED,
];

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRepository(JobApplicationStatusHistory)
    private readonly statusHistoryRepo: Repository<JobApplicationStatusHistory>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly jobPostings: JobPostingsService,
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

    // Resolve the position. Preferred path: apply to an admin-posted vacancy
    // (jobPostingId) — we validate it's open/not-expired and take the title from
    // it. Legacy path: a free-text position (kept for backward compatibility).
    let jobPostingId: string | null = null;
    let positionAppliedFor: string;
    if (dto.jobPostingId) {
      const posting = await this.jobPostings.assertOpenForApplication(dto.jobPostingId);
      jobPostingId = posting.id;
      positionAppliedFor = posting.title;
    } else if (dto.positionAppliedFor?.trim()) {
      positionAppliedFor = dto.positionAppliedFor.trim();
    } else {
      throw new BadRequestException('Select a job to apply for');
    }

    // Prevent accidental duplicate applications while one is still in progress —
    // per posting when applying to a vacancy, otherwise per free-text position.
    const duplicate = await this.applicationRepo.findOne({
      where: {
        applicantId,
        status: In(ACTIVE_STATUSES),
        ...(jobPostingId ? { jobPostingId } : { positionAppliedFor: ILike(positionAppliedFor) }),
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `You already have an application in progress for "${positionAppliedFor}" (tracking ${duplicate.trackingCode}).`,
      );
    }

    const trackingNumber = await this.generateTrackingNumber();
    const trackingCode = await this.generateUniqueTrackingCode();

    const application = this.applicationRepo.create({
      trackingNumber,
      trackingCode,
      applicantId,
      jobPostingId,
      fullNames: dto.fullNames,
      email: dto.email ?? null,
      phone: dto.phone,
      positionAppliedFor,
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
    this.notifySubmission(saved);
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
   * Minimal, safe status view for a phone-verified tracking session (looked up
   * by application id, which only comes from a valid signed tracking token).
   * Returns no documents, phone or email.
   */
  async getTrackingInfo(applicationId: string) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['statusHistory'],
    });
    if (!application) throw new NotFoundException('Application not found');
    return {
      trackingCode: application.trackingCode,
      fullNames: application.fullNames,
      positionAppliedFor: application.positionAppliedFor,
      status: application.status,
      moreInfoRequested: application.moreInfoRequested,
      rejectionReason: application.rejectionReason,
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

  /**
   * Applicant's reply to a reviewer's "request more info". Appends any attached
   * documents, records the message on the timeline, and returns the application
   * to the review queue (more_info_requested → under_review).
   */
  async respondToMoreInfo(
    id: string,
    applicantId: string,
    dto: RespondMoreInfoDto,
  ): Promise<JobApplication> {
    const application = await this.findOwn(id, applicantId);
    if (application.status !== JobApplicationStatus.MORE_INFO_REQUESTED) {
      throw new BadRequestException('This application is not awaiting more information');
    }

    if (dto.documents?.length) {
      const existing = application.documents.additionalDocuments ?? [];
      application.documents = {
        ...application.documents,
        additionalDocuments: [...existing, ...dto.documents],
      };
    }

    const prev = application.status;
    application.status = JobApplicationStatus.UNDER_REVIEW;
    await this.saveScalarFields(application);
    await this.recordStatusChange(
      application.id,
      prev,
      JobApplicationStatus.UNDER_REVIEW,
      applicantId,
      `Applicant response: ${dto.message}`,
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

    switch (toStatus) {
      case JobApplicationStatus.MORE_INFO_REQUESTED:
        this.notifyMoreInfo(application);
        break;
      case JobApplicationStatus.ACCEPTED:
        this.notifyDecision(application, true);
        break;
      case JobApplicationStatus.REJECTED:
        this.notifyDecision(application, false);
        break;
    }
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

  /** Crypto-random public tracking code, retried on the (astronomically rare) collision. */
  private async generateUniqueTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateTrackingCode();
      const clash = await this.applicationRepo.count({ where: { trackingCode: code } });
      if (clash === 0) return code;
    }
    throw new Error('Could not generate a unique tracking code');
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

  // ── Notifications (SMS + email; fire-and-forget, never throw) ──────────────────

  private esc(s: string | null | undefined): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private statusUrl(): string {
    const base = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
    return `${base}/en/services/jobs/status`;
  }

  private dispatchSms(to: string | null, message: string): void {
    if (!to) return;
    void this.smsService.sendSms(to, message);
  }

  private dispatchEmail(to: string | null, subject: string, html: string): void {
    if (!to) return;
    this.emailService.sendEmail({ to, subject, html }).catch((err) => {
      this.logger.warn(`Job application email to ${to} failed: ${err}`);
    });
  }

  private emailShell(title: string, bodyHtml: string): string {
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
      <h2 style="color:#1A7A4A">${this.esc(title)}</h2>${bodyHtml}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Rwanda Muslim Community — Job Applications</p></div>`;
  }

  private notifySubmission(app: JobApplication): void {
    const url = this.statusUrl();
    const msg = `RMC Jobs: Your application for "${app.positionAppliedFor}" was received. Tracking number: ${app.trackingCode}. Track it at ${url}`;
    if (this.notifSettings.isSmsEnabled('jobApplications.submission')) this.dispatchSms(app.phone, msg);
    if (this.notifSettings.isEmailEnabled('jobApplications.submission')) {
      this.dispatchEmail(
        app.email,
        `Job application received — ${app.trackingCode}`,
        this.emailShell(
          'Application received',
          `<p>Dear ${this.esc(app.fullNames)},</p><p>We have received your application for <strong>${this.esc(app.positionAppliedFor)}</strong>.</p><p>Your tracking number is <strong>${this.esc(app.trackingCode)}</strong>. Keep it safe — you can use it to check your status any time at <a href="${url}">${url}</a>.</p>`,
        ),
      );
    }
  }

  private notifyMoreInfo(app: JobApplication): void {
    const url = this.statusUrl();
    const msg = `RMC Jobs: More information is needed for your application ${app.trackingCode}. Please sign in to respond: ${url}`;
    if (this.notifSettings.isSmsEnabled('jobApplications.more_info')) this.dispatchSms(app.phone, msg);
    if (this.notifSettings.isEmailEnabled('jobApplications.more_info')) {
      this.dispatchEmail(
        app.email,
        `More information needed — ${app.trackingCode}`,
        this.emailShell(
          'More information needed',
          `<p>Dear ${this.esc(app.fullNames)},</p><p>Our team needs more information for your application <strong>${this.esc(app.trackingCode)}</strong>.</p>${app.moreInfoRequested ? `<p><em>${this.esc(app.moreInfoRequested)}</em></p>` : ''}<p>Please sign in to respond: <a href="${url}">${url}</a></p>`,
        ),
      );
    }
  }

  private notifyDecision(app: JobApplication, accepted: boolean): void {
    const key = accepted ? 'jobApplications.accepted' : 'jobApplications.rejected';
    const smsMsg = accepted
      ? `RMC Jobs: Good news! Your application ${app.trackingCode} for "${app.positionAppliedFor}" was accepted. We will contact you with next steps.`
      : `RMC Jobs: Update on your application ${app.trackingCode}: it was not selected this time. Thank you for applying.`;
    if (this.notifSettings.isSmsEnabled(key)) this.dispatchSms(app.phone, smsMsg);
    if (this.notifSettings.isEmailEnabled(key)) {
      const subject = accepted
        ? `Application accepted — ${app.trackingCode}`
        : `Application update — ${app.trackingCode}`;
      const bodyHtml = accepted
        ? `<p>Dear ${this.esc(app.fullNames)},</p><p>Congratulations — your application for <strong>${this.esc(app.positionAppliedFor)}</strong> (${this.esc(app.trackingCode)}) has been <strong>accepted</strong>. Our team will contact you with the next steps.</p>`
        : `<p>Dear ${this.esc(app.fullNames)},</p><p>Thank you for applying for <strong>${this.esc(app.positionAppliedFor)}</strong> (${this.esc(app.trackingCode)}). After review, your application was not selected this time.${app.rejectionReason ? `<br/><em>${this.esc(app.rejectionReason)}</em>` : ''}</p>`;
      this.dispatchEmail(app.email, subject, this.emailShell(accepted ? 'Application accepted' : 'Application update', bodyHtml));
    }
  }
}
