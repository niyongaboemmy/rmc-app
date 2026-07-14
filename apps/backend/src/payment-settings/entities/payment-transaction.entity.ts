import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentTransactionDirection {
  /** RequestPayment (§2) — collecting money from a subscriber. */
  COLLECT = 'collect',
  /** RequestDeposit (§3) — sending money to a subscriber. */
  DEPOSIT = 'deposit',
}

/** Records every payment attempt made through the IntouchPay gateway. */
@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Our internal transaction ID sent to IntouchPay as requesttransactionid. */
  @Index('IDX_ptx_request_txn_id')
  @Column({ name: 'request_transaction_id', type: 'varchar', length: 100 })
  requestTransactionId: string;

  /** Transaction ID assigned by IntouchPay gateway. */
  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 200, nullable: true })
  gatewayTransactionId: string | null;

  /** Payment method code used (MOMO_INTOUCH, etc.). */
  @Column({ name: 'payment_method_code', type: 'varchar', length: 50 })
  paymentMethodCode: string;

  /** Payment type key (DONATION, MARRIAGE_FEE, etc.) — may be null for test transactions. */
  @Column({ name: 'payment_type_key', type: 'varchar', length: 50, nullable: true })
  paymentTypeKey: string | null;

  /** Optional reference to a related domain record (e.g. marriage application id). */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ name: 'mobile_phone', type: 'varchar', length: 30 })
  mobilePhone: string;

  @Index('IDX_ptx_status')
  @Column({ type: 'varchar', length: 20, default: PaymentTransactionStatus.PENDING })
  status: PaymentTransactionStatus;

  /** Whether this transaction collects money from, or sends money to, the subscriber. */
  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentTransactionDirection.COLLECT,
  })
  direction: PaymentTransactionDirection;

  @Column({ name: 'response_code', type: 'varchar', length: 20, nullable: true })
  responseCode: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  /** Raw JSON callback payload received from IntouchPay webhook. */
  @Column({ name: 'callback_payload', type: 'jsonb', nullable: true })
  callbackPayload: Record<string, unknown> | null;

  /** Whether this is a test payment (not a real transaction). */
  @Column({ name: 'is_test', type: 'boolean', default: false })
  isTest: boolean;

  @Column({ name: 'initiated_by', type: 'uuid', nullable: true })
  initiatedBy: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
