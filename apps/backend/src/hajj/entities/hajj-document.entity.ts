import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HajjApplication } from './hajj-application.entity';

/** The two payment proofs every applicant must upload. */
export enum HajjDocumentType {
  REGISTRATION_FEE = 'registration_fee',
  ADVANCE_PAYMENT = 'advance_payment',
}

export const REQUIRED_HAJJ_DOCUMENTS: HajjDocumentType[] = [
  HajjDocumentType.REGISTRATION_FEE,
  HajjDocumentType.ADVANCE_PAYMENT,
];

/**
 * A real uploaded receipt, stored on the file server. We keep the storage `key`
 * (folder/uuid.ext) plus enough metadata for the admin UI to render it inline —
 * mime decides <img> vs <iframe>, and the original name is what the applicant
 * saw. Mirrors marriage_documents.
 */
@Entity('hajj_documents')
export class HajjDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => HajjApplication, (app) => app.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application?: HajjApplication;

  @Column({ name: 'document_type', type: 'varchar', length: 40 })
  documentType: HajjDocumentType;

  /** File-server key — resolve to a URL with fileUrl(key) on the frontend. */
  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  /** The admin ticks this off once they have actually opened and checked it. */
  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
