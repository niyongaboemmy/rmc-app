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

/** Which IremboPay merchant a mapping (or an invoice) belongs to. */
export type ProviderEnvironment = 'sandbox' | 'production';

/** Currencies RMC has an IremboPay payment account for. */
export const PROVIDER_CURRENCIES = ['RWF', 'USD', 'EUR'] as const;
export type ProviderCurrency = (typeof PROVIDER_CURRENCIES)[number];

/**
 * Maps one of our payment types (optionally a specific rate) to the provider's
 * own product identifier — e.g. MARRIAGE_FEE / "Outside Mosque" → `PI-3e5fe23f2d`.
 *
 * This is a table rather than a constant because product codes are created in
 * the IremboPay portal by an admin, differ between sandbox and production, and
 * must be changeable without a redeploy.
 *
 * A row with a null `paymentTypeRateId` is the type's default mapping, used when
 * the charge names no rate or the rate has no mapping of its own. Rows are
 * unique per (provider, environment, type, rate, currency) — `UQ_ptpp_scope`.
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

  /**
   * ISO 4217. IremboPay products are per currency (Sadaqat_RWF, Sadaqat_USD…),
   * and the invoice's payment account must be in the same currency.
   */
  @Column({ type: 'char', length: 3, default: 'RWF' })
  currency: string;

  /**
   * The merchant the product code exists on. Sandbox and production are
   * separate merchants with different codes; the gateway's Test-mode flag picks
   * which set is live, so the sandbox rows survive the cutover untouched.
   */
  @Column({ type: 'varchar', length: 10, default: 'sandbox' })
  environment: ProviderEnvironment;

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
