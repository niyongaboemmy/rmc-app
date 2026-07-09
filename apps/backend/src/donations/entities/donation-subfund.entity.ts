import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DonationCategory, CategoryStatus } from './donation-category.entity';

/** A sub-fund (cause card) under a donation category (admin-managed). */
@Entity('donation_subfunds')
export class DonationSubFund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => DonationCategory, (c) => c.subfunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: DonationCategory;

  /** Stable slug — matches the `fund` key encoded in donation message metadata. */
  @Column({ type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  /** Optional link to a live campaign (for the progress bar / event funds). */
  @Column({ name: 'campaign_slug', type: 'varchar', length: 200, nullable: true })
  campaignSlug: string | null;

  @Column({ name: 'label_en', type: 'varchar', length: 200, default: '' }) labelEn: string;
  @Column({ name: 'label_rw', type: 'varchar', length: 200, default: '' }) labelRw: string;
  @Column({ name: 'label_ar', type: 'varchar', length: 200, default: '' }) labelAr: string;

  @Column({ name: 'long_en', type: 'text', default: '' }) longEn: string;
  @Column({ name: 'long_rw', type: 'text', default: '' }) longRw: string;
  @Column({ name: 'long_ar', type: 'text', default: '' }) longAr: string;

  @Column({ name: 'impact_en', type: 'varchar', length: 300, default: '' }) impactEn: string;
  @Column({ name: 'impact_rw', type: 'varchar', length: 300, default: '' }) impactRw: string;
  @Column({ name: 'impact_ar', type: 'varchar', length: 300, default: '' }) impactAr: string;

  @Column({ name: 'examples_en', type: 'jsonb', default: () => "'[]'" }) examplesEn: string[];
  @Column({ name: 'examples_rw', type: 'jsonb', default: () => "'[]'" }) examplesRw: string[];
  @Column({ name: 'examples_ar', type: 'jsonb', default: () => "'[]'" }) examplesAr: string[];

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
