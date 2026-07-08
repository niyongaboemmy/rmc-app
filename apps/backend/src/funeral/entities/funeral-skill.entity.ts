import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/**
 * An attendant (volunteer) skill — the data-driven replacement for the old
 * hardcoded task enum. A volunteer's `skills` and `assignedTask` hold skill
 * `key`s. Admins add / edit / remove / reorder skills via the CMS.
 */
@Entity('funeral_skills')
export class FuneralSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable slug stored on volunteers. Immutable once created. */
  @Index('IDX_funeral_skill_key', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  key: string;

  @Column({ name: 'label_en', type: 'varchar', length: 120 })
  labelEn: string;

  @Column({ name: 'label_rw', type: 'varchar', length: 120, default: '' })
  labelRw: string;

  @Column({ name: 'label_ar', type: 'varchar', length: 120, default: '' })
  labelAr: string;

  @Index('IDX_funeral_skill_sort')
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
