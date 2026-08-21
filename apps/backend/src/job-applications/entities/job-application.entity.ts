import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { JobApplicationStatusHistory } from './job-application-status-history.entity';

export enum JobApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  SHORTLISTED = 'shortlisted',
  MORE_INFO_REQUESTED = 'more_info_requested',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/** A single uploaded document — `key` is the file-server storage key. */
export interface JobDocument {
  key: string;
  name: string;
}

export interface JobApplicationDocuments {
  applicationLetter: JobDocument;
  cv: JobDocument;
  nationalId: JobDocument;
  criminalRecord: JobDocument;
  academicPapers: JobDocument[];
  /** Either a verified good-conduct certificate number… */
  goodConductCertificateNumber?: string;
  /** …or an uploaded good-conduct certificate file. */
  goodConductCertificate?: JobDocument;
  employerRecommendation?: JobDocument;
  /** Extra documents the applicant uploads when responding to a more-info request. */
  additionalDocuments?: JobDocument[];
}

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Internal, sequential reference (admin-facing). NOT used for public lookup.
  @Column({ name: 'tracking_number', type: 'varchar', length: 40, unique: true })
  trackingNumber: string;

  // Public, cryptographically-random, unguessable code the applicant uses to
  // track their application (RMC-JOB-<YYMM>-<random>). Non-enumerable.
  @Index('IDX_job_applications_tracking_code', { unique: true })
  @Column({ name: 'tracking_code', type: 'varchar', length: 40 })
  trackingCode: string;

  @Index('IDX_job_applications_applicant')
  @Column({ name: 'applicant_id', type: 'uuid' })
  applicantId: string;

  // The admin-posted vacancy this application targets (null for legacy/free-text).
  @Index('IDX_job_applications_posting')
  @Column({ name: 'job_posting_id', type: 'uuid', nullable: true })
  jobPostingId: string | null;

  // Applicant
  @Column({ name: 'full_names', type: 'varchar', length: 150 })
  fullNames: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'position_applied_for', type: 'varchar', length: 150 })
  positionAppliedFor: string;

  // Residence
  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cell: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  village: string | null;

  // Uploaded documents (file-server keys)
  @Column({ type: 'jsonb' })
  documents: JobApplicationDocuments;

  // Status workflow
  @Index('IDX_job_applications_status')
  @Column({ type: 'varchar', length: 30, default: JobApplicationStatus.SUBMITTED })
  status: JobApplicationStatus;

  // Review
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'more_info_requested', type: 'text', nullable: true })
  moreInfoRequested: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => JobApplicationStatusHistory, (h) => h.application)
  statusHistory: JobApplicationStatusHistory[];
}
