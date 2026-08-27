import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Which provider call produced the event.
 *
 * The first four are legacy: no code emits them any more, but historical rows
 * written while IntouchPay was the gateway contain them, so the union must keep
 * accepting them or reading the archive stops type-checking.
 */
export type PaymentOperation =
  // Legacy (retired provider) — read-only, never written
  | 'request_payment'
  | 'get_status'
  | 'get_balance'
  | 'deposit'
  // IremboPay
  | 'create_invoice'
  | 'get_invoice'
  | 'initiate_push'
  | 'update_invoice';

/**
 * HTTP-level outcome of a single provider attempt — deliberately separate from
 * the business payment status. 'success' means the provider responded in time
 * (whatever it said); 'timeout'/'error' mean we never got a usable answer.
 */
export type PaymentEventOutcome = 'success' | 'timeout' | 'error';

/**
 * One row per provider request attempt. Lets us answer "how often is the payment
 * gateway slow or down?" without trawling logs — query by outcome/latency/time
 * window.
 *
 * Provider-neutral: it lives in `payments/` rather than under any one
 * integration, and `provider` names which gateway produced the row.
 */
@Entity('payment_provider_events')
export class PaymentProviderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, default: 'irembopay' })
  provider: string;

  @Index('IDX_payment_event_operation')
  @Column({ type: 'varchar', length: 40 })
  operation: PaymentOperation;

  @Index('IDX_payment_event_outcome')
  @Column({ type: 'varchar', length: 20 })
  outcome: PaymentEventOutcome;

  /** Whether the outcome was produced by the dev simulator rather than the real gateway. */
  @Column({ type: 'boolean', default: false })
  simulated: boolean;

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs: number;

  /** True when latency crossed the "slow provider" warning threshold. */
  @Column({ type: 'boolean', default: false })
  slow: boolean;

  /** 1-based attempt number within a single logical call (retries share the requestTransactionId). */
  @Column({ type: 'integer', default: 1 })
  attempt: number;

  @Column({ name: 'response_code', type: 'varchar', length: 30, nullable: true })
  responseCode: string | null;

  @Column({ name: 'request_transaction_id', type: 'varchar', length: 200, nullable: true })
  requestTransactionId: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Index('IDX_payment_event_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
