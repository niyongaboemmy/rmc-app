import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/** Currencies a Hajj fee can be quoted in. Mirrored by the DB check constraint. */
export const HAJJ_CURRENCIES = ['RWF', 'USD'] as const;
export type HajjCurrency = (typeof HAJJ_CURRENCIES)[number];

/**
 * A Hajj eligibility/checklist item shown on the public Hajj page — the
 * data-driven replacement for the hardcoded requirements array the page used to
 * ship with. Admins can add / edit / remove / reorder them and set the amount
 * and its currency, both of which change from season to season.
 *
 * `amount` + `currency` are the single source of truth for the fees: the
 * registration form reads the same rows, so an admin who edits a fee here
 * changes both the landing page and the form. Mirrors funeral_steps.
 */
@Entity('hajj_requirements')
export class HajjRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Stable slug. The registration form looks up its two payment amounts by key
   * (registrationFee / advancePayment), so those two keys are load-bearing —
   * renaming them would silently detach the form from the CMS. Immutable.
   */
  @Index('IDX_hajj_requirement_key', { unique: true })
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

  /** Null for a requirement that costs nothing (e.g. a valid passport). */
  @Column({ name: 'amount', type: 'integer', nullable: true })
  amount: number | null;

  /** Currency the amount is quoted in. Ignored when `amount` is null. */
  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: HajjCurrency;

  /** Required vs merely recommended — drives the pill on the public card. */
  @Column({ type: 'boolean', default: true })
  mandatory: boolean;

  @Index('IDX_hajj_requirement_sort')
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** lucide icon name (from a fixed set) shown on the card. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

/**
 * The two requirements whose amounts the registration form renders and whose
 * receipts the applicant must upload. The form falls back to its own constants
 * if these rows are missing, but deleting them would leave the fees unstated.
 */
export const HAJJ_FEE_KEYS = {
  REGISTRATION: 'registrationFee',
  ADVANCE: 'advancePayment',
} as const;
