import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting, JobPostingStatus } from './entities/job-posting.entity';
import { JobApplication } from './entities/job-application.entity';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';

@Injectable()
export class JobPostingsService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly postingRepo: Repository<JobPosting>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private slugify(title: string): string {
    const base = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 190) || 'job';
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }

  /** True when a posting is open AND its deadline (if any) hasn't passed. */
  isAcceptingApplications(posting: JobPosting): boolean {
    if (posting.status !== JobPostingStatus.OPEN) return false;
    if (posting.applicationDeadline && new Date(posting.applicationDeadline).getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  /** Loads a posting for the application flow, enforcing that it accepts applications. */
  async assertOpenForApplication(id: string): Promise<JobPosting> {
    const posting = await this.postingRepo.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.status !== JobPostingStatus.OPEN) {
      throw new BadRequestException('This position is not currently open for applications');
    }
    if (posting.applicationDeadline && new Date(posting.applicationDeadline).getTime() < Date.now()) {
      throw new BadRequestException('The application deadline for this position has passed');
    }
    return posting;
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  /** Open, non-expired postings for public browsing. */
  async listOpen(filters: { search?: string; employmentType?: string; districtId?: string } = {}) {
    const qb = this.postingRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: JobPostingStatus.OPEN })
      .andWhere('(p.applicationDeadline IS NULL OR p.applicationDeadline >= :now)', { now: new Date().toISOString() })
      .orderBy('p.publishedAt', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    if (filters.search) qb.andWhere('(p.title ILIKE :q OR p.department ILIKE :q)', { q: `%${filters.search}%` });
    if (filters.employmentType) qb.andWhere('p.employmentType = :et', { et: filters.employmentType });
    if (filters.districtId) qb.andWhere('p.districtId = :d', { d: filters.districtId });

    return qb.getMany();
  }

  async getPublic(id: string): Promise<JobPosting> {
    const posting = await this.postingRepo.findOne({ where: { id } });
    if (!posting || posting.status === JobPostingStatus.DRAFT) {
      throw new NotFoundException('Job posting not found');
    }
    return posting;
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(filters: { status?: string; search?: string } = {}) {
    const qb = this.postingRepo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.search) qb.andWhere('(p.title ILIKE :q OR p.department ILIKE :q)', { q: `%${filters.search}%` });
    const items = await qb.getMany();
    return this.withCounts(items);
  }

  async adminGet(id: string): Promise<JobPosting> {
    const posting = await this.postingRepo.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    return (await this.withCounts([posting]))[0];
  }

  async create(adminId: string, dto: CreateJobPostingDto): Promise<JobPosting> {
    const status = dto.status ?? JobPostingStatus.DRAFT;
    const posting = this.postingRepo.create({
      title: dto.title,
      slug: this.slugify(dto.title),
      department: dto.department ?? null,
      employmentType: dto.employmentType ?? undefined,
      location: dto.location ?? null,
      districtId: dto.districtId ?? null,
      description: dto.description,
      responsibilities: dto.responsibilities ?? null,
      requirements: dto.requirements ?? null,
      numberOfPositions: dto.numberOfPositions ?? 1,
      salaryRange: dto.salaryRange ?? null,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : null,
      status,
      postedBy: adminId,
      publishedAt: status === JobPostingStatus.OPEN ? new Date() : null,
    });
    return this.postingRepo.save(posting);
  }

  async update(id: string, dto: UpdateJobPostingDto): Promise<JobPosting> {
    const posting = await this.adminGet(id);
    const wasOpen = posting.status === JobPostingStatus.OPEN;

    Object.assign(posting, {
      title: dto.title ?? posting.title,
      department: dto.department ?? posting.department,
      employmentType: dto.employmentType ?? posting.employmentType,
      location: dto.location ?? posting.location,
      districtId: dto.districtId ?? posting.districtId,
      description: dto.description ?? posting.description,
      responsibilities: dto.responsibilities ?? posting.responsibilities,
      requirements: dto.requirements ?? posting.requirements,
      numberOfPositions: dto.numberOfPositions ?? posting.numberOfPositions,
      salaryRange: dto.salaryRange ?? posting.salaryRange,
      applicationDeadline:
        dto.applicationDeadline !== undefined
          ? dto.applicationDeadline
            ? new Date(dto.applicationDeadline)
            : null
          : posting.applicationDeadline,
      status: dto.status ?? posting.status,
    });

    // Stamp publishedAt the first time it goes open.
    if (!wasOpen && posting.status === JobPostingStatus.OPEN && !posting.publishedAt) {
      posting.publishedAt = new Date();
    }
    // Strip the transient count before save.
    delete posting.applicationsCount;
    return this.postingRepo.save(posting);
  }

  async setStatus(id: string, status: JobPostingStatus): Promise<JobPosting> {
    const posting = await this.adminGet(id);
    posting.status = status;
    if (status === JobPostingStatus.OPEN && !posting.publishedAt) posting.publishedAt = new Date();
    delete posting.applicationsCount;
    return this.postingRepo.save(posting);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    const posting = await this.postingRepo.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    const count = await this.applicationRepo.count({ where: { jobPostingId: id } });
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete: ${count} application(s) reference this posting. Close it instead.`,
      );
    }
    await this.postingRepo.softDelete(id);
    return { id, deleted: true };
  }

  /** Attaches applicationsCount to each posting. */
  private async withCounts(items: JobPosting[]): Promise<JobPosting[]> {
    if (items.length === 0) return items;
    const rows = await this.applicationRepo
      .createQueryBuilder('a')
      .select('a.jobPostingId', 'pid')
      .addSelect('COUNT(*)', 'count')
      .where('a.jobPostingId IN (:...ids)', { ids: items.map((i) => i.id) })
      .groupBy('a.jobPostingId')
      .getRawMany<{ pid: string; count: string }>();
    const map = new Map(rows.map((r) => [r.pid, Number(r.count)]));
    for (const it of items) it.applicationsCount = map.get(it.id) ?? 0;
    return items;
  }
}
