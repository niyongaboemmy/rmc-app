import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenderApplication } from './tender-application.entity';

/** The three documents every bid must carry. Mirrored by the CHECK constraint in migration 035. */
export enum TenderDocumentType {
  RDB_CERTIFICATE = 'rdb_certificate',
  TAX_CLEARANCE = 'tax_clearance',
  PROPOSAL = 'proposal',
}

export const REQUIRED_TENDER_DOCUMENTS: TenderDocumentType[] = [
  TenderDocumentType.RDB_CERTIFICATE,
  TenderDocumentType.TAX_CLEARANCE,
  TenderDocumentType.PROPOSAL,
];

@Entity('tender_application_documents')
export class TenderApplicationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_tender_app_doc_application')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'doc_type', type: 'varchar', length: 30 })
  docType: TenderDocumentType;

  /** Storage key on the file-server — NOT a URL. Resolve with fileUrl(key) on the frontend. */
  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;

  @ManyToOne(() => TenderApplication, (a) => a.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: TenderApplication;
}
