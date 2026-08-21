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

export type ReportTargetType = 'question' | 'answer';
export type ReportStatus = 'open' | 'actioned' | 'dismissed';

/**
 * A member's report of a question or answer.
 *
 * `target_id` is polymorphic (points at either table) so it is intentionally NOT a foreign
 * key — the service validates the target exists. UQ_dawah_reports_one_per_user makes one
 * report per person per item the DB's job, so a single angry member cannot manufacture a
 * queue.
 */
@Entity('dawah_reports')
export class DawahReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: ReportTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter?: User;

  @Column({ type: 'varchar', length: 40 })
  reason: string;

  @Column({ type: 'text', default: '' })
  note: string;

  @Index('IDX_dawah_reports_status_created')
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: ReportStatus;

  @Column({ name: 'handled_by_id', type: 'uuid', nullable: true })
  handledById: string | null;

  @Column({ name: 'handled_at', type: 'timestamptz', nullable: true })
  handledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
