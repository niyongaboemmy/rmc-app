import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScholarshipApplication } from './scholarship-application.entity';

/**
 * Supporting-document categories an applicant can attach. Unlike marriage's
 * fixed one-per-type slots, scholarship applicants may upload several files
 * (e.g. multiple transcripts), so the type is a loose label and there is no
 * per-type uniqueness constraint — documents are appended, never upserted.
 */
export enum ScholarshipDocumentType {
  TRANSCRIPT = 'transcript',
  ACADEMIC_RECORD = 'academic_record',
  PROOF = 'proof',
  ADDITIONAL = 'additional',
}

@Entity('scholarship_documents')
export class ScholarshipDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => ScholarshipApplication, (app) => app.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: ScholarshipApplication;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType: ScholarshipDocumentType;

  /**
   * Which of the scholarship's `required_documents` this file answers — matches
   * the `key` in that array. Null for a generic upload, or for anything filed
   * before scholarships declared their own requirements (migration 055).
   */
  @Column({ name: 'requirement_key', type: 'varchar', length: 40, nullable: true })
  requirementKey: string | null;

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
