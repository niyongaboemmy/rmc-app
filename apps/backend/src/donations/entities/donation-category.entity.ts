import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { DonationSubFund } from './donation-subfund.entity';

export type CategoryStatus = 'active' | 'inactive';

/** A top-level donation category shown on the public donate page (admin-managed). */
@Entity('donation_categories')
export class DonationCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable slug — matches the `category` key encoded in donation message metadata. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  key: string;

  /** lucide-react icon name (resolved on the frontend via an icon registry). */
  @Column({ type: 'varchar', length: 40, default: 'HandHeart' })
  icon: string;

  @Column({ type: 'varchar', length: 10, default: 'green' })
  tone: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @Column({ name: 'title_en', type: 'varchar', length: 200, default: '' }) titleEn: string;
  @Column({ name: 'title_rw', type: 'varchar', length: 200, default: '' }) titleRw: string;
  @Column({ name: 'title_ar', type: 'varchar', length: 200, default: '' }) titleAr: string;

  @Column({ name: 'desc_en', type: 'text', default: '' }) descEn: string;
  @Column({ name: 'desc_rw', type: 'text', default: '' }) descRw: string;
  @Column({ name: 'desc_ar', type: 'text', default: '' }) descAr: string;

  @Column({ name: 'long_en', type: 'text', default: '' }) longEn: string;
  @Column({ name: 'long_rw', type: 'text', default: '' }) longRw: string;
  @Column({ name: 'long_ar', type: 'text', default: '' }) longAr: string;

  @Column({ name: 'impact_en', type: 'varchar', length: 300, default: '' }) impactEn: string;
  @Column({ name: 'impact_rw', type: 'varchar', length: 300, default: '' }) impactRw: string;
  @Column({ name: 'impact_ar', type: 'varchar', length: 300, default: '' }) impactAr: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CategoryStatus;

  @OneToMany(() => DonationSubFund, (sf) => sf.category)
  subfunds: DonationSubFund[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
