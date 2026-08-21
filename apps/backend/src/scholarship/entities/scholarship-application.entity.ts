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
import { ScholarshipStatusHistory } from './scholarship-status-history.entity';
import { ScholarshipDocument } from './scholarship-document.entity';
import { ScholarshipLevel } from './scholarship-program.entity';

export enum ScholarshipApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  CONFIRMED = 'confirmed',
}

export enum ScholarshipGender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum ScholarshipRelationship {
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  SIBLING = 'sibling',
  OTHER = 'other',
}

@Entity('scholarship_applications')
export class ScholarshipApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_number', type: 'varchar', length: 40, nullable: true, unique: true })
  applicationNumber: string | null;

  @Index('IDX_scholarship_app_applicant')
  @Column({ name: 'applicant_id', type: 'uuid' })
  applicantId: string;

  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId: string | null;

  // Identity
  @Column({ name: 'full_names', type: 'varchar', length: 150 })
  fullNames: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: ScholarshipGender | null;

  @Column({ name: 'national_id', type: 'varchar', length: 30, nullable: true })
  nationalId: string | null;

  // Residence
  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cell: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  village: string | null;

  // Contact
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  // Education
  @Column({ name: 'school_name', type: 'varchar', length: 200 })
  schoolName: string;

  @Column({ name: 'education_level', type: 'varchar', length: 20 })
  educationLevel: ScholarshipLevel;

  @Column({ name: 'current_year', type: 'varchar', length: 50 })
  currentYear: string;

  @Column({ name: 'average_grade', type: 'varchar', length: 20, nullable: true })
  averageGrade: string | null;

  // Guardian
  @Column({ name: 'guardian_name', type: 'varchar', length: 150 })
  guardianName: string;

  @Column({ name: 'guardian_phone', type: 'varchar', length: 20 })
  guardianPhone: string;

  @Column({ type: 'varchar', length: 20 })
  relationship: ScholarshipRelationship;

  @Column({ type: 'text' })
  motivation: string;

  // Status
  @Index('IDX_scholarship_app_status')
  @Column({ type: 'varchar', length: 20, default: ScholarshipApplicationStatus.DRAFT })
  status: ScholarshipApplicationStatus;

  // Review
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Read-only from this side — cascade deliberately omitted, matching
  // good-conduct-request.entity.ts's rationale: saving an application loaded
  // with an eagerly-populated statusHistory relation must never null out an
  // already-correct history row's FK.
  @OneToMany(() => ScholarshipStatusHistory, (h) => h.application)
  statusHistory: ScholarshipStatusHistory[];

  @OneToMany(() => ScholarshipDocument, (d) => d.application)
  documents: ScholarshipDocument[];
}
