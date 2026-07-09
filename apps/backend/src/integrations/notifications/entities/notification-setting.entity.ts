import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type NotificationGroup = 'Authentication' | 'Marriage Service';

@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Machine-readable event key, e.g. "auth.welcome_email". */
  @Index({ unique: true })
  @Column({ name: 'event_key', type: 'varchar', length: 100 })
  eventKey: string;

  /** UI display name. */
  @Column({ type: 'varchar', length: 200 })
  label: string;

  /** Short explanation shown to the admin. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Logical grouping used to build sections in the UI. */
  @Column({ name: 'group_name', type: 'varchar', length: 100 })
  groupName: string;

  /** Whether this event type CAN use email (false = email not applicable). */
  @Column({ name: 'email_applicable', type: 'boolean', default: true })
  emailApplicable: boolean;

  /** Whether this event type CAN use SMS (false = SMS not applicable). */
  @Column({ name: 'sms_applicable', type: 'boolean', default: true })
  smsApplicable: boolean;

  /** Send via email when triggered. */
  @Column({ name: 'email_enabled', type: 'boolean', default: false })
  emailEnabled: boolean;

  /** Send via SMS when triggered. */
  @Column({ name: 'sms_enabled', type: 'boolean', default: false })
  smsEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
