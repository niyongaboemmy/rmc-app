import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { HajjDocument } from './hajj-document.entity';

/**
 * Lifecycle of a Hajj application.
 *
 *   submitted ──▶ under_review ──▶ approved   (final)
 *                              └─▶ rejected   (final, reason required)
 *
 * The applicant is notified on every transition, so the final decision never
 * arrives without the review step having been announced first.
 */
export enum HajjApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Statuses an admin may move an application to (i.e. not the initial one). */
export const HAJJ_ADMIN_STATUSES: HajjApplicationStatus[] = [
  HajjApplicationStatus.UNDER_REVIEW,
  HajjApplicationStatus.APPROVED,
  HajjApplicationStatus.REJECTED,
];

/** Once a decision is made the application is closed to further transitions. */
export const HAJJ_FINAL_STATUSES: HajjApplicationStatus[] = [
  HajjApplicationStatus.APPROVED,
  HajjApplicationStatus.REJECTED,
];

@Entity('hajj_applications')
export class HajjApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable public credential, e.g. RMC-HAJ-202607-00042. This — not the
   * uuid — is what the applicant is told, texted, and types into the status page.
   */
  @Index({ unique: true })
  @Column({ name: 'application_number', type: 'varchar', length: 30 })
  applicationNumber: string;

  // Public, cryptographically-random, unguessable code for the OTP-gated status
  // lookup (RMC-HAJ-<YYMM>-<random>). Non-enumerable.
  @Index('IDX_hajj_applications_tracking_code', { unique: true })
  @Column({ name: 'tracking_code', type: 'varchar', length: 40 })
  trackingCode: string;

  // ── Applicant ─────────────────────────────────────────────────────────────
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  /** Normalised Rwandan number, 07XXXXXXXX. Required — SMS is the primary channel. */
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  /** Optional: the applicant is emailed the branded decision letter only if given. */
  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 100 })
  sector: string;

  @Column({ name: 'passport_number', type: 'varchar', length: 30 })
  passportNumber: string;

  /**
   * The uploaded payment receipts. Real files on the file server — the admin opens
   * and verifies them, rather than reading a filename the applicant typed.
   */
  @OneToMany(() => HajjDocument, (doc) => doc.application, { cascade: ['insert'] })
  documents: HajjDocument[];

  // ── Review ────────────────────────────────────────────────────────────────
  @Index()
  @Column({
    type: 'varchar',
    length: 30,
    default: HajjApplicationStatus.SUBMITTED,
  })
  status: HajjApplicationStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  /** Internal admin note — never sent to the applicant. */
  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  /** Sent to the applicant verbatim when the application is rejected. */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
