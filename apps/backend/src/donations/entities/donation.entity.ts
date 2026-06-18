import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DonationCampaign } from './donation-campaign.entity';

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum DonationFrequency {
  ONCE = 'once',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/** A single donation made through the public donate page. */
@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_donations_campaign_id')
  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @ManyToOne(() => DonationCampaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: DonationCampaign | null;

  @Index('IDX_donations_donor_id')
  @Column({ name: 'donor_id', type: 'uuid', nullable: true })
  donorId: string | null;

  // Guest donor identity (when the donor is not a registered user)
  @Column({ name: 'donor_name', type: 'varchar', length: 150, nullable: true })
  donorName: string | null;

  @Column({ name: 'donor_email', type: 'varchar', length: 150, nullable: true })
  donorEmail: string | null;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Index('IDX_donations_frequency')
  @Column({ type: 'varchar', length: 20, default: DonationFrequency.ONCE })
  frequency: DonationFrequency;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true })
  paymentMethod: string | null;

  @Index('IDX_donations_status')
  @Column({ type: 'varchar', length: 20, default: DonationStatus.PENDING })
  status: DonationStatus;

  @Column({ name: 'next_charge_date', type: 'date', nullable: true })
  nextChargeDate: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Index('IDX_donations_donated_at')
  @Column({ name: 'donated_at', type: 'timestamptz' })
  donatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
