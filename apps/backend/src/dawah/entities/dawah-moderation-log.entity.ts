import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ModerationAction =
  | 'auto_hide'
  | 'hide'
  | 'restore'
  | 'lock'
  | 'unlock'
  | 'delete'
  | 'policy_change';

/**
 * Append-only record of every moderation act. NOT optional: hiding a member's religious
 * question is a social act, and "who hid my question and why" must have an answer that is
 * not "nobody knows".
 *
 * `moderator_id` is NULLABLE because auto-hide has no human behind it — that null is the
 * signal that the crowd, not a person, pulled the post. The one defence against the
 * report threshold becoming a heckler's veto is THIS being read.
 */
@Entity('dawah_moderation_log')
export class DawahModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'moderator_id', type: 'uuid', nullable: true })
  moderatorId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moderator_id' })
  moderator?: User | null;

  @Column({ type: 'varchar', length: 30 })
  action: ModerationAction;

  @Index('IDX_dawah_moderation_log_target')
  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: 'question' | 'answer';

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ type: 'text', default: '' })
  reason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
