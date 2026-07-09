import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /** Multilingual title. Falls back to `title` when absent. */
  @Column({ name: 'title_i18n', type: 'jsonb', nullable: true })
  titleI18n: { en: string; rw: string; ar: string } | null;

  /** Multilingual content. Falls back to `content` when absent. */
  @Column({ name: 'content_i18n', type: 'jsonb', nullable: true })
  contentI18n: { en: string; rw: string; ar: string } | null;

  @Column({ type: 'varchar', length: 10, default: 'normal' })
  priority: string;

  @Column({ name: 'target_audience', type: 'varchar', length: 20, default: 'all' })
  targetAudience: string;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  @Column({ name: 'publish_at', type: 'timestamptz' })
  publishAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'varchar', length: 30, default: 'announcement' })
  type: string; // 'announcement' | 'tender'

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;

  @Column({ name: 'broadcast_sent', type: 'boolean', default: false })
  broadcastSent: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
