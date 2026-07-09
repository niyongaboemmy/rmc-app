import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sms_messages')
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', array: true })
  recipients: string[];

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'sender', type: 'varchar', length: 20, nullable: true })
  sender: string | null;

  @Column({ type: 'varchar', length: 30, default: 'intouch' })
  provider: string;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ name: 'total_messages', type: 'int', nullable: true })
  totalMessages: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number | null;

  @Column({ name: 'balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceAfter: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** Per-recipient delivery details stored as-is from the API. */
  @Column({ type: 'jsonb', nullable: true })
  details: object | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
