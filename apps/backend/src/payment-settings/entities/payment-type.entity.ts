import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentTypeRate } from './payment-type-rate.entity';

/** Unique keys used in application code to reference payment service areas. */
export enum PaymentTypeKey {
  DONATION = 'DONATION',
  MARRIAGE_FEE = 'MARRIAGE_FEE',
  MEMBERSHIP_FEE = 'MEMBERSHIP_FEE',
  SCHOOL_FEE = 'SCHOOL_FEE',
  EVENT_FEE = 'EVENT_FEE',
  ZAKAT = 'ZAKAT',
  GOOD_CONDUCT_FEE = 'GOOD_CONDUCT_FEE',
}

@Entity('payment_types')
export class PaymentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Immutable unique key — never rename or delete, only disable via isActive. */
  @Column({ type: 'varchar', length: 50, unique: true })
  key: PaymentTypeKey;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Default flat amount (RWF). Used when the type has no rates, or as a fallback. */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  amount: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => PaymentTypeRate, (r) => r.paymentType, { cascade: true, eager: false })
  rates: PaymentTypeRate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
