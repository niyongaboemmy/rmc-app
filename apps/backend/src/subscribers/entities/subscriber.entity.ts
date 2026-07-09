import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** A newsletter subscriber (email-only, single opt-in). */
@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_subscribers_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Active subscribers receive broadcasts; unsubscribing flips this to false. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Preferred locale for localized emails (en | rw | ar). */
  @Column({ type: 'varchar', length: 5, default: 'en' })
  locale: string;

  /** Where the subscription came from (e.g. 'footer'). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  source: string | null;

  /** Opaque token embedded in the one-click unsubscribe link. */
  @Index('IDX_subscribers_unsub_token', { unique: true })
  @Column({ name: 'unsubscribe_token', type: 'uuid' })
  unsubscribeToken: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
