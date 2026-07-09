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
import { GoodConductStatusHistory } from './good-conduct-status-history.entity';
import { GoodConductTransaction } from './good-conduct-transaction.entity';

export enum GoodConductStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  MORE_INFO_REQUESTED = 'more_info_requested',
  APPROVED = 'approved',
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

export enum GoodConductMotif {
  EMPLOYMENT = 'employment',
  VISA = 'visa',
  SCHOOL = 'school',
  OTHER = 'other',
}

@Entity('good_conduct_requests')
export class GoodConductRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'certificate_number', type: 'varchar', length: 40, nullable: true, unique: true })
  certificateNumber: string | null;

  @Index('IDX_good_conduct_req_applicant')
  @Column({ name: 'applicant_id', type: 'uuid' })
  applicantId: string;

  // Identity
  @Column({ name: 'full_names', type: 'varchar', length: 150 })
  fullNames: string;

  @Column({ name: 'father_name', type: 'varchar', length: 150, nullable: true })
  fatherName: string | null;

  @Column({ name: 'mother_name', type: 'varchar', length: 150, nullable: true })
  motherName: string | null;

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

  // Masjid / Imam
  @Index('IDX_good_conduct_req_mosque')
  @Column({ name: 'mosque_id', type: 'uuid', nullable: true })
  mosqueId: string | null;

  @Column({ name: 'requested_imam_name', type: 'varchar', length: 150, nullable: true })
  requestedImamName: string | null;

  @Column({ name: 'assigned_imam_id', type: 'uuid', nullable: true })
  assignedImamId: string | null;

  // Request detail
  @Column({ type: 'varchar', length: 50 })
  motif: GoodConductMotif;

  @Column({ name: 'motif_detail', type: 'text', nullable: true })
  motifDetail: string | null;

  // Status
  @Index('IDX_good_conduct_req_status')
  @Column({ type: 'varchar', length: 30, default: GoodConductStatus.DRAFT })
  status: GoodConductStatus;

  @Index('IDX_good_conduct_req_payment_status')
  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2 })
  amountDue: number;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

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

  // Certificate
  @Column({ name: 'certificate_url', type: 'varchar', length: 500, nullable: true })
  certificateUrl: string | null;

  @Column({ name: 'certificate_qr_payload', type: 'varchar', length: 300, nullable: true })
  certificateQrPayload: string | null;

  @Column({ name: 'certificate_issued_at', type: 'timestamptz', nullable: true })
  certificateIssuedAt: Date | null;

  @Column({ name: 'certificate_issued_by', type: 'uuid', nullable: true })
  certificateIssuedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Relations — read-only from the request side. Rows are always created via
  // their own repos directly (statusHistoryRepo/transactionRepo), never by
  // cascading from a saved GoodConductRequest, so cascade is deliberately
  // omitted: with it enabled, saving a request loaded with these relations
  // eagerly populated (e.g. via adminGetById/findOwn) caused TypeORM to null
  // out an already-correct transaction's request_id FK on save.
  @OneToMany(() => GoodConductStatusHistory, (h) => h.request)
  statusHistory: GoodConductStatusHistory[];

  @OneToMany(() => GoodConductTransaction, (tx) => tx.request)
  transactions: GoodConductTransaction[];
}
