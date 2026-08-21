import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/**
 * A funeral request lifecycle step — the data-driven replacement for the old
 * hardcoded stage enum. The ordered set of active steps defines the lifecycle;
 * a request's `stage` holds a step `key`. Admins can add / edit / remove /
 * reorder steps and customise their colour + icon via the CMS.
 */
@Entity('funeral_steps')
export class FuneralStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable slug stored on requests as their `stage`. Immutable once created. */
  @Index('IDX_funeral_step_key', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  key: string;

  @Column({ name: 'title_en', type: 'varchar', length: 120 })
  titleEn: string;

  @Column({ name: 'title_rw', type: 'varchar', length: 120, default: '' })
  titleRw: string;

  @Column({ name: 'title_ar', type: 'varchar', length: 120, default: '' })
  titleAr: string;

  @Column({ name: 'description_en', type: 'text', default: '' })
  descriptionEn: string;

  @Column({ name: 'description_rw', type: 'text', default: '' })
  descriptionRw: string;

  @Column({ name: 'description_ar', type: 'text', default: '' })
  descriptionAr: string;

  @Index('IDX_funeral_step_sort')
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Accent colour (hex) for the timeline node/badge. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  /** lucide icon name (from a fixed set) shown on the timeline node. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
