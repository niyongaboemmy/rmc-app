import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';

@Entity('payment_method_settings')
export class PaymentMethodSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_method_id', type: 'uuid', unique: true })
  paymentMethodId: string;

  @ManyToOne(() => PaymentMethod, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  /**
   * Credential / configuration fields stored as a flat JSON map.
   * Sensitive fields (partnerPassword, secretKey, etc.) are masked
   * before returning to the API unless explicitly revealed.
   */
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, string>;

  @Column({ name: 'is_test_mode', type: 'boolean', default: true })
  isTestMode: boolean;

  @Column({ name: 'is_configured', type: 'boolean', default: false })
  isConfigured: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
