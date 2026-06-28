import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('upload_settings')
export class UploadSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Maximum allowed file size in bytes. 0 means no limit. */
  @Column({ name: 'max_file_size', type: 'bigint', default: 524288000 })
  maxFileSize: number;

  /**
   * List of allowed MIME types. Empty array means all types are allowed.
   * Stored as a JSON array in a text column for broad DB compatibility.
   */
  @Column({ name: 'allowed_mime_types', type: 'jsonb', default: '[]' })
  allowedMimeTypes: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
