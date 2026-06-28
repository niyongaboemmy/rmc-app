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
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

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
