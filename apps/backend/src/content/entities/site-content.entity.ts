import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Generic key/value store for editable site content (landing page sections, etc.).
 *
 * Each row holds one section keyed by `sectionKey` (e.g. "who-we-are"). The
 * `value` column is a JSONB blob whose shape is owned by the section — typically
 * carrying per-language fields (…En / …Rw / …Ar) plus any scalar settings. This
 * lets new sections be added without a schema migration.
 */
@Entity('site_content')
export class SiteContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_site_content_section_key', { unique: true })
  @Column({ name: 'section_key', type: 'varchar', length: 64, unique: true })
  sectionKey: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value: Record<string, unknown>;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
