import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarriageApplication } from './marriage-application.entity';

export enum DocumentType {
  GROOM_ID = 'groom_id',
  BRIDE_ID = 'bride_id',
  GROOM_PHOTO = 'groom_photo',
  BRIDE_PHOTO = 'bride_photo',
  WALI_CONSENT = 'wali_consent',
  MAHR_AGREEMENT = 'mahr_agreement',
  PORTRAIT = 'portrait',
  ADDITIONAL = 'additional',
  SIGNED_PROVISIONAL = 'signed_provisional',
}

@Entity('marriage_documents')
export class MarriageDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => MarriageApplication, (app) => app.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: MarriageApplication;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType: DocumentType;

  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
