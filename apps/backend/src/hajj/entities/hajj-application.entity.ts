import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { HajjDocument, HajjDocumentType } from './hajj-document.entity';

/**
 * Lifecycle of a Hajj application.
 *
 *   submitted ──▶ under_review ──▶ approved            (final)
 *                     │         └─▶ rejected           (final, reason required)
 *                     │
 *                     └─▶ more_info_requested ──▶ under_review
 *                         (message required; applicant re-uploads, which
 *                          returns it to review — see `resubmitDocuments`)
 *
 * The applicant is notified on every transition, so the final decision never
 * arrives without the review step having been announced first.
 *
 * `more_info_requested` is deliberately NOT final: it is the one status the
 * applicant can move off themselves, by supplying what was asked for.
 */
export enum HajjApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  MORE_INFO_REQUESTED = 'more_info_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Statuses an admin may move an application to (i.e. not the initial one). */
export const HAJJ_ADMIN_STATUSES: HajjApplicationStatus[] = [
  HajjApplicationStatus.UNDER_REVIEW,
  HajjApplicationStatus.MORE_INFO_REQUESTED,
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

  /**
   * What the applicant still has to supply, sent to them verbatim (SMS + email)
   * and shown on the tracking page. Cleared the moment they resubmit, so a stale
   * request can never linger next to a fresh document.
   */
  @Column({ name: 'more_info_requested', type: 'text', nullable: true })
  moreInfoRequested: string | null;

  /**
   * Which receipt(s) the admin asked the applicant to (re)upload, set alongside
   * `moreInfoRequested`. Drives the tracking page to show exactly those upload
   * slots, and bounds what the applicant may replace — a resubmit can neither
   * touch an unrequested (possibly already-verified) receipt nor return the
   * application to review until every requested one is in. Cleared when the ask
   * is answered or the status moves on. Null on legacy rows / when unspecified.
   */
  @Column({ name: 'more_info_document_types', type: 'simple-array', nullable: true })
  moreInfoDocumentTypes: HajjDocumentType[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
