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
import { MarriageDocument } from './marriage-document.entity';
import { MarriageStatusHistory } from './marriage-status-history.entity';
import { MarriageTransaction } from './marriage-transaction.entity';

export enum MarriageApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  AMENDMENTS_REQUESTED = 'amendments_requested',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING_CASH = 'pending_cash',
  PROCESSING = 'processing',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum VenueType {
  MOSQUE = 'mosque',
  OUTSIDE = 'outside',
}

@Entity('marriage_applications')
export class MarriageApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_marriage_app_number')
  @Column({ name: 'application_number', type: 'varchar', length: 30, unique: true })
  applicationNumber: string;

  // Public, cryptographically-random, unguessable code for the OTP-gated status
  // lookup (RMC-MAR-<YYMM>-<random>). Non-enumerable.
  @Index('IDX_marriage_applications_tracking_code', { unique: true })
  @Column({ name: 'tracking_code', type: 'varchar', length: 40 })
  trackingCode: string;

  @Index('IDX_marriage_app_applicant')
  @Column({ name: 'applicant_id', type: 'uuid' })
  applicantId: string;

  @Column({ name: 'notification_phone', type: 'varchar', length: 30, nullable: true })
  notificationPhone: string | null;

  // Groom
  @Column({ name: 'groom_user_id', type: 'uuid', nullable: true })
  groomUserId: string | null;

  @Column({ name: 'groom_name', type: 'varchar', length: 150 })
  groomName: string;

  @Column({ name: 'groom_father_name', type: 'varchar', length: 150, nullable: true })
  groomFatherName: string | null;

  @Index('IDX_marriage_app_groom_nid')
  @Column({ name: 'groom_nid', type: 'varchar', length: 16 })
  groomNid: string;

  @Column({ name: 'groom_birth_date', type: 'date', nullable: true })
  groomBirthDate: Date | null;

  @Column({ name: 'groom_phone', type: 'varchar', length: 20, nullable: true })
  groomPhone: string | null;

  // Bride
  @Column({ name: 'bride_user_id', type: 'uuid', nullable: true })
  brideUserId: string | null;

  @Column({ name: 'bride_name', type: 'varchar', length: 150 })
  brideName: string;

  @Column({ name: 'bride_father_name', type: 'varchar', length: 150, nullable: true })
  brideFatherName: string | null;

  @Index('IDX_marriage_app_bride_nid')
  @Column({ name: 'bride_nid', type: 'varchar', length: 16 })
  brideNid: string;

  @Column({ name: 'bride_birth_date', type: 'date', nullable: true })
  brideBirthDate: Date | null;

  @Column({ name: 'bride_phone', type: 'varchar', length: 20, nullable: true })
  bridePhone: string | null;

  // Islamic requirements
  @Column({ name: 'wali_name', type: 'varchar', length: 150, nullable: true })
  waliName: string | null;

  @Column({ name: 'wali_nid', type: 'varchar', length: 16, nullable: true })
  waliNid: string | null;

  @Column({ name: 'wali_phone', type: 'varchar', length: 20, nullable: true })
  waliPhone: string | null;

  @Column({ name: 'mahr_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  mahrAmount: number | null;

  @Column({ name: 'mahr_currency', type: 'varchar', length: 10, default: 'RWF' })
  mahrCurrency: string;

  @Column({ name: 'mahr_description', type: 'text', nullable: true })
  mahrDescription: string | null;

  // Witnesses
  @Column({ name: 'witness1_nid', type: 'varchar', length: 16 })
  witness1Nid: string;

  @Column({ name: 'witness1_name', type: 'varchar', length: 150, nullable: true })
  witness1Name: string | null;

  @Column({ name: 'witness2_nid', type: 'varchar', length: 16 })
  witness2Nid: string;

  @Column({ name: 'witness2_name', type: 'varchar', length: 150, nullable: true })
  witness2Name: string | null;

  // Officiant
  @Column({ name: 'requested_officiant', type: 'varchar', length: 150, nullable: true })
  requestedOfficiant: string | null;

  @Column({ name: 'assigned_imam_id', type: 'uuid', nullable: true })
  assignedImamId: string | null;

  // Venue
  @Column({ name: 'venue_type', type: 'varchar', length: 20 })
  venueType: VenueType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'mosque_id', type: 'uuid', nullable: true })
  mosqueId: string | null;

  @Column({ name: 'venue_address', type: 'text', nullable: true })
  venueAddress: string | null;

  // Scheduling
  @Column({ name: 'preferred_date_from', type: 'date', nullable: true })
  preferredDateFrom: Date | null;

  @Column({ name: 'preferred_date_to', type: 'date', nullable: true })
  preferredDateTo: Date | null;

  @Index('IDX_marriage_app_ceremony_date')
  @Column({ name: 'ceremony_date', type: 'timestamptz', nullable: true })
  ceremonyDate: Date | null;

  @Column({ name: 'ceremony_scheduled_by', type: 'uuid', nullable: true })
  ceremonyScheduledBy: string | null;

  @Column({ name: 'ceremony_scheduled_at', type: 'timestamptz', nullable: true })
  ceremonyScheduledAt: Date | null;

  // Status
  @Index('IDX_marriage_app_status')
  @Column({ type: 'varchar', length: 30, default: MarriageApplicationStatus.DRAFT })
  status: MarriageApplicationStatus;

  @Index('IDX_marriage_app_payment_status')
  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountDue: number;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true })
  paymentMethod: string | null;

  // Review
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'amendments_requested_text', type: 'text', nullable: true })
  amendmentsRequestedText: string | null;

  // Certificate
  @Column({ name: 'certificate_url', type: 'varchar', length: 500, nullable: true })
  certificateUrl: string | null;

  @Column({ name: 'certificate_qr_code', type: 'varchar', length: 200, nullable: true })
  certificateQrCode: string | null;

  @Column({ name: 'certificate_issued_at', type: 'timestamptz', nullable: true })
  certificateIssuedAt: Date | null;

  @Column({ name: 'certificate_issued_by', type: 'uuid', nullable: true })
  certificateIssuedBy: string | null;

  @Column({ name: 'wedding_photo_url', type: 'varchar', length: 500, nullable: true })
  weddingPhotoUrl: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Relations
  @OneToMany(() => MarriageDocument, (doc) => doc.application, { cascade: true })
  documents: MarriageDocument[];

  @OneToMany(() => MarriageStatusHistory, (h) => h.application, { cascade: true })
  statusHistory: MarriageStatusHistory[];

  @OneToMany(() => MarriageTransaction, (tx) => tx.application, { cascade: true })
  transactions: MarriageTransaction[];
}
