import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sms_config')
export class SmsConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** InTouch account username (e.g. "RMC"). */
  @Column({ type: 'varchar', length: 100 })
  username: string;

  /** InTouch account password — stored AES-256-GCM encrypted. */
  @Column({ name: 'password_enc', type: 'text' })
  passwordEnc: string;

  /** Sender ID shown to recipients — alpha-numeric, max 11 chars. */
  @Column({ name: 'sender_name', type: 'varchar', length: 11, default: 'RMC' })
  senderName: string;

  /** Optional URL where InTouch will POST delivery reports. */
  @Column({ name: 'dlr_url', type: 'varchar', length: 500, nullable: true })
  dlrUrl: string | null;

  /** Whether this configuration is active. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Last known account balance in RWF (updated after each send response). */
  @Column({ name: 'balance_rwf', type: 'decimal', precision: 12, scale: 2, nullable: true })
  balanceRwf: number | null;

  @Column({ name: 'balance_updated_at', type: 'timestamptz', nullable: true })
  balanceUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
