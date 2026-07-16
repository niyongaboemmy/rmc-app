import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum JobPostingStatus {
  DRAFT = 'draft', // created, not visible to applicants
  OPEN = 'open', // published and accepting applications
  CLOSED = 'closed', // no longer accepting applications
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  VOLUNTEER = 'volunteer',
}

@Entity('job_postings')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index('IDX_job_postings_slug', { unique: true })
  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  department: string | null;

  @Column({ name: 'employment_type', type: 'varchar', length: 30, default: EmploymentType.FULL_TIME })
  employmentType: EmploymentType;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  responsibilities: string | null;

  @Column({ type: 'text', nullable: true })
  requirements: string | null;

  @Column({ name: 'number_of_positions', type: 'int', default: 1 })
  numberOfPositions: number;

  @Column({ name: 'salary_range', type: 'varchar', length: 120, nullable: true })
  salaryRange: string | null;

  @Index('IDX_job_postings_status')
  @Column({ type: 'varchar', length: 20, default: JobPostingStatus.DRAFT })
  status: JobPostingStatus;

  @Column({ name: 'application_deadline', type: 'timestamptz', nullable: true })
  applicationDeadline: Date | null;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Populated on read (not a stored column) — count of applications received.
  applicationsCount?: number;
}
