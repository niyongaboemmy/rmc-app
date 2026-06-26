import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentType } from './payment-type.entity';

/**
 * A specific pricing tier / sub-category within a PaymentType.
 * E.g. MARRIAGE_FEE has rates: "Mosque Ceremony" (30,000) and "Outside Mosque" (200,000).
 * The `code` field is an optional stable identifier for use in application logic.
 */
@Entity('payment_type_rates')
export class PaymentTypeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_type_id', type: 'uuid' })
  paymentTypeId: string;

  @ManyToOne(() => PaymentType, (pt) => pt.rates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_type_id' })
  paymentType: PaymentType;

  /** Stable code for application-side lookup (e.g. 'MOSQUE', 'OUTSIDE_MOSQUE'). Optional. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Amount in the service area's base currency (RWF). */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
