import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** IremboPay's own invoice lifecycle. `EXPIRED` is inferred, not pushed. */
export type IremboInvoiceStatus = 'NEW' | 'PAID' | 'PARTIALLY_PAID' | 'EXPIRED';

/**
 * Local mirror of a provider-side IremboPay invoice.
 *
 * Kept so reconciliation, the admin views and the webhook handler can answer
 * "what did we last know about this invoice?" without an API round-trip — and
 * so an invoice survives even if we never hear back from IremboPay again.
 */
@Entity('irembopay_invoices')
export class IremboPayInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** OUR key, sent as `transactionId`. Also our idempotency key. */
  @Column({ name: 'transaction_id', type: 'varchar', length: 100, unique: true })
  transactionId: string;

  /** THEIR key. Null only in the window between our insert and their response. */
  @Column({ name: 'invoice_number', type: 'varchar', length: 50, nullable: true, unique: true })
  invoiceNumber: string | null;

  /** Determines the invoice currency on IremboPay's side. */
  @Column({ name: 'payment_account_identifier', type: 'varchar', length: 50 })
  paymentAccountIdentifier: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Index('IDX_irembo_inv_status')
  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'NEW' })
  paymentStatus: IremboInvoiceStatus;

  /** MTN_MOMO | AIRTEL_MONEY | ONLINE_CARD | BK | … — free string, not an enum:
   *  IremboPay adds channels without warning and an unknown value must not throw. */
  @Column({ name: 'payment_method', type: 'varchar', length: 30, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ name: 'payment_link_url', type: 'text', nullable: true })
  paymentLinkUrl: string | null;

  @Column({ name: 'expiry_at', type: 'timestamptz', nullable: true })
  expiryAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'partial_payment_enabled', type: 'boolean', default: false })
  partialPaymentEnabled: boolean;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  paidAmount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  balance: number | null;

  @Column({ name: 'payment_type_key', type: 'varchar', length: 50, nullable: true })
  paymentTypeKey: string | null;

  /** Domain record this invoice pays for (donation.id, application.id, …). */
  @Index('IDX_irembo_inv_ref')
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'is_test', type: 'boolean', default: true })
  isTest: boolean;

  /** Last full payload seen (create response, webhook, or reconciliation fetch). */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @Index('IDX_irembo_inv_created')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
