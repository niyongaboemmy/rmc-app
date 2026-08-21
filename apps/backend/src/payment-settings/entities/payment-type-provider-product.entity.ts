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
import { PaymentTypeRate } from './payment-type-rate.entity';

/**
 * Maps one of our payment types (optionally a specific rate) to the provider's
 * own product identifier — e.g. MARRIAGE_FEE / "Outside Mosque" → `PI-3e5fe23f2d`.
 *
 * This is a table rather than a constant because product codes are created in
 * the IremboPay portal by an admin, differ between sandbox and production, and
 * must be changeable without a redeploy.
 *
 * A row with a null `paymentTypeRateId` is the type's default mapping, used when
 * the charge names no rate or the rate has no mapping of its own.
 */
@Entity('payment_type_provider_products')
export class PaymentTypeProviderProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, default: 'irembopay' })
  provider: string;

  @Column({ name: 'payment_type_id', type: 'uuid' })
  paymentTypeId: string;

  @ManyToOne(() => PaymentType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_type_id' })
  paymentType: PaymentType;

  @Column({ name: 'payment_type_rate_id', type: 'uuid', nullable: true })
  paymentTypeRateId: string | null;

  @ManyToOne(() => PaymentTypeRate, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'payment_type_rate_id' })
  paymentTypeRate: PaymentTypeRate | null;

  /** The provider's product code, e.g. `PI-3e5fe23f2d`. */
  @Column({ name: 'product_code', type: 'varchar', length: 60 })
  productCode: string;

  /** Overrides the method-level payment account — e.g. to bill this type in USD. */
  @Column({
    name: 'payment_account_identifier',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentAccountIdentifier: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
