import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/** Statuses whose campaigns are reachable on the public site (grid = ACTIVE only;
 *  a detail page also renders COMPLETED so a finished campaign's link still works). */
export const PUBLIC_VISIBLE_STATUSES = [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED];

/** A donation program / cause shown on the public donate page. */
@Entity('donation_campaigns')
export class DonationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Index('IDX_donation_campaigns_slug')
  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'target_amount', type: 'decimal', precision: 14, scale: 2 })
  targetAmount: number;

  @Column({ name: 'raised_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  raisedAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Index('IDX_donation_campaigns_fund_type')
  @Column({ name: 'fund_type', type: 'varchar', length: 20, default: 'general' })
  fundType: string;

  /** Sub-fund this program belongs to (when its category has sub-funds). */
  @Index('IDX_campaigns_sub_fund_id')
  @Column({ name: 'sub_fund_id', type: 'uuid', nullable: true })
  subFundId: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'hero_image_url', type: 'varchar', length: 500, nullable: true })
  heroImageUrl: string | null;

  /** File-server keys / URLs for the campaign detail-page gallery. */
  @Column({ name: 'gallery_images', type: 'jsonb', default: () => "'[]'" })
  galleryImages: string[];

  /** Whether this campaign fills the featured hero block on the donate page. */
  @Index('IDX_donation_campaigns_featured')
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  /** Manual ordering weight for the grid (lower = earlier). */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /** Override for the donate button label (e.g. "Give Zakat"); null = default. */
  @Column({ name: 'cta_text', type: 'varchar', length: 60, nullable: true })
  ctaText: string | null;

  @Index('IDX_donation_campaigns_status')
  @Column({ type: 'varchar', length: 20, default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
