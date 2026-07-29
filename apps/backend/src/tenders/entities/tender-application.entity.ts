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
import {
  TenderApplicationDocument,
  TenderDocumentType,
} from './tender-application-document.entity';
import { TenderApplicationStatusHistory } from './tender-application-status-history.entity';
import { TenderMoreInfoField } from '../more-info-targets';

export enum TenderApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  MORE_INFO_REQUESTED = 'more_info_requested',
  SHORTLISTED = 'shortlisted',
  AWARDED = 'awarded',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

@Entity('tender_applications')
export class TenderApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_number', type: 'varchar', length: 40, unique: true })
  applicationNumber: string;

  /**
   * Crypto-random, unguessable public tracking code (RMC-TND-YYMM-XXXXXXXX). This
   * — not the sequential applicationNumber — is what the OTP-gated status lookup
   * resolves, so the tracking endpoint can't be enumerated. Given to the bidder
   * on submission.
   */
  @Index('IDX_tender_app_tracking_code', { unique: true })
  @Column({ name: 'tracking_code', type: 'varchar', length: 40 })
  trackingCode: string;

  /** FK into `announcements` — the tender is an announcement row with type='tender'. */
  @Index('IDX_tender_app_tender')
  @Column({ name: 'tender_id', type: 'uuid' })
  tenderId: string;

  @Index('IDX_tender_app_applicant')
  @Column({ name: 'applicant_id', type: 'uuid' })
  applicantId: string;

  // Bidding company
  @Column({ name: 'company_name', type: 'varchar', length: 200 })
  companyName: string;

  @Column({ name: 'company_tin', type: 'varchar', length: 20 })
  companyTin: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 150 })
  contactName: string;

  // Contact
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  // Address
  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cell: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  village: string | null;

  // Bid detail
  @Column({ name: 'bid_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  bidAmount: number | null;

  @Column({ name: 'cover_note', type: 'text', nullable: true })
  coverNote: string | null;

  // Status
  @Index('IDX_tender_app_status')
  @Column({ type: 'varchar', length: 30, default: TenderApplicationStatus.SUBMITTED })
  status: TenderApplicationStatus;

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

  /**
   * Which field groups the reviewer asked the bidder to correct, set alongside
   * `moreInfoRequested`. Bounds what a re-submission may change: a bid scoped to
   * ['company'] keeps its stored bid amount no matter what the payload says.
   * Cleared once the ask is answered. Null on legacy rows / when unscoped, which
   * falls back to "everything is editable".
   */
  @Column({ name: 'more_info_fields', type: 'simple-array', nullable: true })
  moreInfoFields: TenderMoreInfoField[] | null;

  /**
   * Same, for attachments — exactly which documents may be replaced. An
   * unrequested document keeps its file AND its verification flag, so answering
   * one ask cannot quietly reset a reviewer's earlier check on another.
   */
  @Column({ name: 'more_info_document_types', type: 'simple-array', nullable: true })
  moreInfoDocumentTypes: TenderDocumentType[] | null;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Read-only from the application side — child rows are always written through
  // their own repos, never by cascading from a saved TenderApplication. Cascade
  // is deliberately omitted here for the same reason it is on GoodConductRequest:
  // saving an entity that was loaded WITH these relations populated makes TypeORM
  // nullify the FK of any child row missing from the (stale) in-memory array.
  // See also `saveScalarFields()` in tenders.service.ts.
  @OneToMany(() => TenderApplicationDocument, (d) => d.application)
  documents: TenderApplicationDocument[];

  @OneToMany(() => TenderApplicationStatusHistory, (h) => h.application)
  statusHistory: TenderApplicationStatusHistory[];
}
