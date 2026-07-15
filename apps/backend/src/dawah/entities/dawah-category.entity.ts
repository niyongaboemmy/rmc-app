import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/**
 * One taxonomy shared by both halves of Dawah Learning — a "Fiqh" category must
 * mean the same thing on the Courses page and in the Library, so courses and
 * books point at the same rows rather than each keeping their own list.
 * Modelled on blog_categories; ordered, activatable and soft-deletable like
 * hajj_requirements.
 *
 * Deliberately holds no `courses` / `books` back-relations. Importing them here
 * would close a require cycle (category → course → book → course) and, because
 * ContentStatus is read eagerly in a decorator argument, the file the cycle
 * re-enters would see it as `undefined` and the process would die at boot with
 * "Cannot read properties of undefined". Nothing needs to walk from a category
 * to its members anyway — the queries all run the other way, filtering courses
 * or books BY category. Same shape as DriveItem.owner, which is likewise a
 * ManyToOne with no inverse side.
 */
@Entity('dawah_categories')
export class DawahCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Used in the public `?category=` filter, so it is part of the URL contract. */
  @Column({ type: 'varchar', length: 80, unique: true })
  slug: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ name: 'name_rw', type: 'varchar', length: 120, default: '' })
  nameRw: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 120, default: '' })
  nameAr: string;

  /** lucide-react icon name, e.g. 'BookOpen'. Rendered on the category chip. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon: string | null;

  @Index('IDX_dawah_categories_sort')
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
